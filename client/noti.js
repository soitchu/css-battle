class notification{
	constructor(DomElem,data){
		this.data=data;
		this.elem=DomElem;
		if("color" in data){
			this.className="redNoti";
		}else{
			this.className="blueNoti";

		}
		this.create();

	}

	create(){

		var newElem=document.createElement("div");
		var dur="";
		if(this.data.perm!=0){
			dur="animation-duration:"+this.data.perm+"s";
			setTimeout(function(){
				try{
				newElem.remove();
				}catch(err){

				}
			},(this.data.perm*1000));
		}
		newElem.className="noti "+this.className;
		newElem.innerHTML=`
				<div class="dot" onclick='removeParent(this);'></div>
				<div class="timer" style='${dur}'></div>
				<div class="noti_head" >${this.data.head}</div>

				<div class="noti_data">
					${this.data.notiData}

				</div>`;

		this.elem.prepend(newElem);

	}


				
}

function removeParent(x){
	x.parentElement.remove();
} 

