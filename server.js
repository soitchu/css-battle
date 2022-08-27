const express = require('express');
const body = require('body-parser');
const app = express();
const fs = require('fs');
const http = require('http');
const multer = require('multer');
const upload = multer();
const cors = require('cors');
const puppeteer = require('puppeteer');
const { Image, createCanvas } = require('canvas');
const options = {};
const referenceImage = {
    'base64': "data:image/png;base64," + fs.readFileSync('client/assets/referenceImage.png', { encoding: 'base64' })
}
let browser;
app.use(upload.none());
app.use(cors());
app.use(body.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/client'));

async function ini() {
    browser = await puppeteer.launch({ args: [] });
    //// Uncomment the following piece of code if you're running it on Glitch.me
    // browser = await puppeteer.launch({ args: ["--no-sandbox"] });
}

ini();

async function getImg64(x) {
    return new Promise(function (resolve, reject) {
        try {
            var image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.onerror = function (error) {
                console.error(error);
                reject(error);
            }
            image.src = x;
        } catch (error) {
            console.error(error);
            reject(error);
        }
    });
}



async function compare(img1, img2) {
    return new Promise(async function (resolve, reject) {
        try {
            const width = 400;
            const height = 400;
            let referenceCanvas = createCanvas(400, 400);
            let refCanCtx = referenceCanvas.getContext('2d');
            let canvas = createCanvas(400, 400);
            var canCtx = canvas.getContext('2d');

            refCanCtx.drawImage(await getImg64(img1), 0, 0);
            canCtx.drawImage(await getImg64(img2), 0, 0);

            let refImageData = refCanCtx.getImageData(0, 0, height, width).data;
            let ImageData = canCtx.getImageData(0, 0, height, width).data;
            let count = 0;

            // let out = fs.createWriteStream(__dirname + '/client/assets/referenceImage.png');
            // let stream = canvas.createPNGStream();
            // stream.pipe(out);

            ImageData = new Uint32Array(ImageData.buffer);
            refImageData = new Uint32Array(refImageData.buffer);

            for (let i = 0; i < refImageData.length; i++) {
                if (refImageData[i] != ImageData[i]) {
                    if (i - 400 >= 0 && i + 400 < refImageData.length) {
                        let mainPixel = refImageData[i];
                        let leftPixel = refImageData[i - 1];
                        let topPixel = refImageData[i + 400];
                        let bottomPixel = refImageData[i - 400];

                        // Making sure anti-aliasing doesn't mess up the comparison
                        if (mainPixel != leftPixel || leftPixel != topPixel || topPixel != bottomPixel) {
                            count++;
                        }
                    } else {
                        count++;
                    }
                } else {
                    count++;
                }
            }
            resolve((count) / (width * height));
        } catch (error) {
            console.error(error);
            reject(error);
        }

    });
}

app.post('/getImage', async (req, res) => {
    if (!("html" in req.body)) {
        res.json({
            "status": "error",
            "message": 'Bad request',
            "code": 430
        });
        return;
    }

    let HTMLString = req.body.html;
    let transformedHTML = HTMLString.replace(/[\s]/g, "");
    let forbiddenKeywords = ["src", "url", "object", "link", "import", "script", "background=",
        "data", "clip-path", "embed", "srcdoc", "svg"];

    for (let i = 0; i < forbiddenKeywords.length; i++) {
        let thisKeyword = forbiddenKeywords[i];
        if (transformedHTML.includes(thisKeyword)) {
            res.json({
                "status": "error",
                "message": `You can't use the keyword "${thisKeyword}"`,
                "code": 400 + i,
            });
            return;
        }
    }

    let page;
    try {
        page = await browser.newPage();
        await page.setJavaScriptEnabled(false);
        await page.setOfflineMode(true);
        await page.setViewport({
            width: 400,
            height: 400,
        });
        await page.setContent(HTMLString);
        let base64 = await page.screenshot({ encoding: "base64" });
        base64 = `data:image/png;base64,${base64}`;

        compare(referenceImage.base64, base64).then(function (x) {
            if (x > 0.995) {
                res.json({
                    "status": "ok",
                    "score": x,
                    "done": 1
                });
            } else {
                res.json({
                    "status": "ok",
                    "score": x
                });
            }
        }).catch(function (x) {
            res.json({
                "status": "error",
                "message": "An unexpected error has happened",
                "code": x
            });
        });

    } catch (error) {
        console.error(error);
        res.json({
            "status": "error",
            "message": "An unexpected error has happened",
            "code": "301"
        });
    } finally {
        page.close().then(() => {}).catch((error) => console.error(error));
    }
});

const httpServer = http.createServer(options, app);
let listener = httpServer.listen((process.env.PORT || 3000), () => {
    console.log("Your app is listening on port " + listener.address().port);
});
