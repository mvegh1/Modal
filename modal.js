'use strict';
let DialogUtil = (function(){
	let DialogUtil = {};
	let RegisteredDialogs = {};
	RegisteredDialogs.Register = function(dlg){
		RegisteredDialogs[dlg.Guid] = dlg;
	}
	RegisteredDialogs.Unregister = function(dlg){
		delete RegisteredDialogs[dlg.Guid];
	}
	RegisteredDialogs.Get = function(guid){
		return RegisteredDialogs[guid];
	}
	let OpenDialogs = new Map();
	OpenDialogs.Set = function(dlg){
		if(OpenDialogs.has(dlg)){
			return -1;
		}
		let zIndex = OpenDialogs.GetMaxZIndex() + 1;
		OpenDialogs.set(dlg,zIndex);
		return zIndex;
	}
	OpenDialogs.Remove = function(dlg){
		OpenDialogs.delete(dlg);
	}
	OpenDialogs.IsOpen = function(dlg){
		if(OpenDialogs.has(dlg)){
			return true;
		}
		return false;
	}
	OpenDialogs.GetZIndex = function(dlg){
		if(OpenDialogs.has(dlg)){
			return OpenDialogs.get(dlg);
		}
	}
	OpenDialogs.GetMaxZIndex = function(dlg){
		let max = -1;
		for(let val of OpenDialogs.values()){
			if(val > max){
				max = val;
			}
		}
		return max;
	}
	
	let ClassNames = {};
	ClassNames.DISABLED = "dialogutil_disabled";
	ClassNames.HIDDEN = "dialogutil_hidden";
	ClassNames.CreateControlClass = function(ctrl){
		return "dialogutil_control_" + ctrl.ControlName.toLowerCase();
	}
	
	let Point = function(x,y){
		this.X = x;
		this.Y = y;
	}
	function getPos(el) {
		for (var lx=0, ly=0;
			 el != null;
			 lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);
		return new Point(lx,ly);
	}
	function GenerateGuid(){
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
		});
	}
	let EventManager = function() {
        this.Events = {};
    }
    EventManager.prototype.FireEvent = function(evt, data) {
        let events = this.Events[evt];
		let rtn = true;
        if (events !== undefined) {
            for (let i = 0; i < events.length; i++) {
                let thisRtn = events[i].apply(this, data);
				if(thisRtn === false){
					rtn = false;
				}
            }
        }
		return rtn;
    }
    EventManager.prototype.BindEvent = function(evt, action) {
        if (this.Events[evt] === undefined) {
            this.Events[evt] = [];
        }
        this.Events[evt].push(action);
    }
    EventManager.prototype.UnbindEvent = function(evt, action) {
            if (this.Events[evt] !== undefined) {
                let newArr = [];
                for (let i = 0; i < this.Events[evt].length; i++) {
                    let event = this.Events[evt][i];
                    if (event !== action) {
                        newArr.push(event);
                    }
                }
                this.Events[evt] = newArr;
            }
    }
	
	let EventBinderFlags = function(evtName,action,domEvtName){
		this.EventName = evtName;
		this.Action = action;
		this.DomEventName = domEvtName;
	}
	let EventBinderToken = function(flags,domMethod){
		this.EventBinderFlags = flags;
		this.DomMethod = domMethod;
	}
	
	let DialogControl = function(name){
		this.Guid = GenerateGuid();
		this.ControlName = name;
		this.Visible = true;
		this.Events = new EventManager();
		this.Disabled = false;
		this.ClassName = "";
		this.Id = "";	
		this.DomNode = null;
		this.Controls = [];
	}
	DialogControl.prototype.Dispose = function(){
		try{
			if(this.Parent != null){
				DialogControl.prototype.RemoveControl.apply(this.Parent,[this]);
			}
			if(this.DomNode != null){
				this.DomNode.remove();
				delete this.DomNode;
			}
			for(let ctrl of this.Controls){
				DialogControl.prototype.RemoveControl.apply(this,[ctrl]);
				ctrl.Dispose();
			}
		}
		catch(e){
			
		}
		finally {
			this.Disposed = true;
			Object.freeze(this);
		}
	}
	DialogControl.prototype.BindEvent = function(flags){
		let scope = this;
		if(flags.Action != null){
			this.Events.BindEvent(flags.EventName,flags.Action);
		}
		if(flags.DomEventName !== ""){
			let method = function(){
				scope.Events.FireEvent(flags.EventName);
			}
			this.DomNode.addEventListener(flags.DomEventName, method, false);
			let token = new EventBinderToken(flags,method);
			return token;
		}
		return new EventBinderToken(flags,null);
	}
	DialogControl.prototype.UnbindEvent = function(token){
		if(token.EventBinderFlags.Action != null){
			this.Events.UnbindEvent(token.EventBinderFlags.EventName,token.EventBinderFlags.Action);
		}
		if(token.EventBinderFlags.DomEventName !== undefined){
			this.DomNode.removeEventListener(token.EventBinderFlags.DomEventName, token.DomMethod, false);
		}		
	}
	DialogControl.prototype.Disable = function(){
		if(this.Disabled === true){
			return false;
		}
		let rtn = this.Events.FireEvent("OnDisable");
		if(rtn === false){
			return false;
		}
		this.Disabled = true;
		this.UpdateDom();
	}
	DialogControl.prototype.Enable = function(){
		if(this.Disabled === false){
			return false;
		}
		let rtn = this.Events.FireEvent("OnEnable");
		if(rtn === false){
			return false;
		}
		this.Disabled = false;
		this.UpdateDom();
	}
	DialogControl.prototype.Hide = function(){
		if(this.Visible === false){
			return false;
		}
		let rtn = this.Events.FireEvent("OnHide");
		if(rtn === false){
			return false;
		}
		this.Visible = false;
		this.UpdateDom();
		return true;
	}
	DialogControl.prototype.Show = function(){
		if(this.Visible === true){
			return false;
		}
		let rtn = this.Events.FireEvent("OnShow");
		if(rtn === false){
			return false;
		}
		this.Visible = true;
		this.UpdateDom();
		return true;
	}
	DialogControl.prototype.FadeIn = function(duration){
		if(this.Visible === true){
			return false;
		}
		duration = duration || 1000;
		let frames = (duration / 1000) * 30;
		let updateAmt = 1/frames;
		this.Show();
		this.DomNode.style.opacity = 0;
		let id = setInterval( () =>{
			this.DomNode.style.opacity = parseFloat(this.DomNode.style.opacity) + updateAmt;
			if(+this.DomNode.style.opacity >= 1){
				this.DomNode.style.opacity = 1;
				clearInterval(id);
			}
		},33);
		return true;
	}
	DialogControl.prototype.FadeOut = function(duration){
		if(this.Visible === false){
			return false;
		}
		let oldDisabled = this.Disabled;
		this.Disable();
		duration = duration || 1000;
		let frames = (duration / 1000) * 30;
		let updateAmt = 1/frames;
		this.Show();
		this.DomNode.style.opacity = 1;
		let id = setInterval( () =>{
			this.DomNode.style.opacity = parseFloat(this.DomNode.style.opacity) - updateAmt;
			if(+this.DomNode.style.opacity <= 0){
				this.DomNode.style.opacity = 0;
				clearInterval(id);
				this.Hide();
				if(oldDisabled === false){
					this.Enable();
				}
			}
		},33);
		return true;
	}	
	DialogControl.prototype.UpdateDom = function(hierarchy){
		hierarchy = hierarchy || [];
		this.DomNode.Id = this.Id;
	    let classStr = `${ClassNames.CreateControlClass(this)}`;
		if(this.ClassName !== ""){
			classStr += ` ${this.ClassName}`;
		}
		
		let visible = this.Visible;
		for(let parent of hierarchy){
			if(parent != null && parent.Visible === false){
				visible = false;
				break;
			}
		}
		if(visible === false){
			classStr += ` ${ClassNames.HIDDEN}`;
		}

		let disabled = this.Disabled;
		for(let parent of hierarchy){
			if(parent != null && parent.Disabled){
				disabled = true;
				break;
			}
		}
		this.DomNode.disabled = (disabled === true ? "disabled" : "");
		if(this.Disabled === true){
			classStr += ` ${ClassNames.DISABLED}`;
		}
		classStr = classStr.trim();
		
		this.DomNode.className = classStr;
		this.DomNode.setAttribute("data-guid",this.Guid);
		if(this.ParentDialog != null){
			this.DomNode.setAttribute("data-dialog-guid", this.ParentDialog.Guid);
		} else {
			this.DomNode.removeAttribute("data-dialog-guid");			
		}
		
		var newHierarchy = Array.from(hierarchy);
		newHierarchy.push(this);
		for(let ctrl of this.Controls){
			ctrl.UpdateDom(newHierarchy);
		}
	}	
	DialogControl.prototype.AddControl = function(ctrl){
		this.Controls.push(ctrl);
		if(ctrl.DomNode != null && this.DomNode != null){
			this.DomNode.appendChild(ctrl.DomNode);
			if(ctrl.Parent != null){
				ctrl.Parent.RemoveControl(ctrl);
			}
			ctrl.Parent = this;
		}
	}
	DialogControl.prototype.RemoveControl = function(ctrl){
		var idx = this.Controls.indexOf(ctrl);
		if(idx > -1){
			this.Controls.splice(idx,1);
			if(ctrl.DomNode != null && this.DomNode != null){
				this.DomNode.removeChild(ctrl.DomNode);
				ctrl.Parent = null;
			}
		}
	}
	Object.defineProperty(DialogControl.prototype,"ParentDialog",{
		get: function getDialog(){
			let dlg = this;
			if(dlg instanceof Dialog || dlg instanceof Modal){
				return dlg;
			}
			while(dlg != null){
				dlg = dlg.Parent;
				if(dlg instanceof Dialog || dlg instanceof Modal){
					return dlg;
				}
			}
			return null;
		}
	});

	let DialogTitleControl = function(){
		let scope = this;
		var args = Array.from(arguments);
		args = ["DialogTitleControl"].concat(args);
		DialogControl.apply(scope,args);		
		scope.DomNode = document.createElement("div");
		scope.TitleTextControl = new DialogHtmlControl();
		scope.TitleTextControl.ClassName = "dialogutil_titletext";
		scope.CloseButton = new DialogButtonControl();
		scope.CloseButton.ClassName = "dialogutil_titleclosebutton";
		scope.CloseButton.Action = function(dlg){
			if(dlg != null){
				dlg.Hide();
			}			
		}
		let closeFlags = new EventBinderFlags("OnClose", function(){
			let dlg = scope.ParentDialog;
			dlg = RegisteredDialogs.Get(dlg.Guid);
			scope.CloseButton.Action(dlg);
		}, "click");
		scope.CloseButton.BindEvent(closeFlags);
		scope.AddControl( scope.TitleTextControl );
		scope.AddControl( scope.CloseButton );
	}
	DialogTitleControl.prototype = Object.create(DialogControl.prototype);
	Object.defineProperty(DialogTitleControl.prototype,"Text",{
		get: function getText(){
			return this.TitleTextControl.Html;
		},
		set: function setText(val){
			this.TitleTextControl.Html = val;
		}
	});

	
	let DialogGenericControl = function(node){
		var args = Array.from(arguments);
		args = ["DialogGenericControl"].concat(args);
		DialogControl.apply(this,args);		
		this.DomNode = node;
		this.Id = this.DomNode.id;
		this.ClassName = this.DomNode.className;
		this.Disabled = this.DomNode.disabled === "disabled" ? true : false;
	}
	DialogGenericControl.prototype = Object.create(DialogControl.prototype);	
	
	let DialogButtonControl = function(){
		var args = Array.from(arguments);
		args = ["DialogButton"].concat(args);
		DialogControl.apply(this,args);
		this.Text = "";
		this.DomNode = document.createElement("input");
		this.DomNode.type = "button";
	}
	DialogButtonControl.prototype = Object.create(DialogControl.prototype);
	DialogButtonControl.prototype.UpdateDom = function(){
		this.DomNode.value = this.Text;
		DialogControl.prototype.UpdateDom.apply(this,arguments);
	}
	let DialogHtmlControl = function(html){
		var args = Array.from(arguments);
		args = ["DialogHtmlControl"].concat(args);
		DialogControl.apply(this,args);	
		this.DomNode = document.createElement("div");
		var _html = html || "";
		if(html instanceof HTMLElement){
			_html = html.outerHTML;
		}
		this.DomNode.innerHTML = _html;
		//Object.freeze(this.Controls);
	}

	DialogHtmlControl.prototype = Object.create(DialogControl.prototype);
	DialogHtmlControl.prototype.UpdateDom = function(){
		DialogControl.prototype.UpdateDom.apply(this,arguments);
	}
	Object.defineProperty(DialogHtmlControl.prototype,"Html", {
		get: function getHtml(){
			return this.DomNode.innerHTML;
		},
		set: function setHtml(val){
			this.DomNode.innerHTML = val;
		}		
	});
	
	let DialogInputControl = function(input){
		if( (input instanceof HTMLInputElement) === false){
			throw Error("Element is not an HTMLInputElement");
		}
		var args = Array.from(arguments);
		DialogGenericControl.apply(this,args);
		this.ControlName = "DialogInput";
	}
	DialogInputControl.prototype = Object.create(DialogGenericControl.prototype);
	
	
	let DialogPanelControl = function(){
		var args = Array.from(arguments);
		args = ["DialogPanelControl"].concat(args);
		DialogControl.apply(this,args);		
		this.DomNode = document.createElement("div");		
	}
	DialogPanelControl.prototype = Object.create(DialogControl.prototype);	
	
	let Dialog = function(html){
		let scope = this;
		var args = Array.from(arguments);
		args = ["Dialog"].concat(args);
		DialogControl.apply(scope,args);
		scope.DomNode = document.createElement("div");
		scope.Visible = false;
		scope.Draggable = true;
		
		this.Title = new DialogTitleControl();
		this.AddControl(this.Title);		
		
		let _mousedown = false;
		let _mousedownOffset = null;
		let _mousedownPt = null;
		
		if(html != null){
			var ctrl = new DialogHtmlControl(html);
			this.AddControl(ctrl);
		}
		
		scope.DomNode.addEventListener("mousedown", function(e){
			_mousedown = true;
			_mousedownPt = new Point(e.pageX,e.pageY);
			_mousedownOffset = getPos(scope.DomNode);
		},false);
		scope.DomNode.addEventListener("mouseup", function(e){
			_mousedown = false;
		},false);
		scope.DomNode.addEventListener("mousemove", function(e){
			if(scope.Draggable === false){
				return true;
			}
			if(_mousedown === false){
				return true;
			}
			let x = e.pageX - _mousedownPt.X;
			let y = e.pageY - _mousedownPt.Y;
			let pos = new Point(_mousedownOffset.X, _mousedownOffset.Y);
			pos.X += x;
			pos.Y += y;
			scope.DomNode.style.left = (pos.X) + "px";
			scope.DomNode.style.top = (pos.Y) + "px";
		},false);
		
		RegisteredDialogs.Register(this);
		
	}
	Dialog.prototype = Object.create(DialogControl.prototype);
	Dialog.prototype.Initialize = function(elm){
		this.UpdateDom([this]);
		this.DomNode.remove();
		if(elm != null){
			elm.appendChild(this.DomNode);
		} else {
			document.body.appendChild(this.DomNode);
		}
	}
	Dialog.prototype.Show = function(){
		let ok = DialogControl.prototype.Show.call(this,[]);
		if(!ok){
			return false;
		}
		let zIndex = OpenDialogs.Set(this);
		this.DomNode.style.zIndex = zIndex + 100000;
		this.DomNode.style.opacity = 1;
		return true;
	}
	Dialog.prototype.Hide = function(){
		let ok = DialogControl.prototype.Hide.call(this,[]);
		if(!ok){
			return false;
		}
		OpenDialogs.Remove(this);
		this.DomNode.style.zIndex = -1;
		this.DomNode.style.opacity = 0;
		return true;
	}	
	let Modal = function(){
		let dialog = new Dialog();
		this.Dialog = dialog;		
		var args = Array.from(arguments);
		args = ["Modal"].concat(args);
		Dialog.apply(this,arguments);
		this.Guid = dialog.Guid;
		this.ControlName = "Modal";
		dialog.Draggable = true;
		dialog.Visible = true;
		this.Draggable = false;
		this.Controls.push(dialog);
		this.DomNode.appendChild(this.Dialog.DomNode);
		//Object.freeze(this.Controls);
		//Object.freeze(this.Dialog);
		
		this.RemoveControl(this.Title);
		delete this.Title;
		
		RegisteredDialogs.Register(this);
	}
	Modal.prototype = Object.create(Dialog.prototype);
	
	Modal.prototype.AddControl = function(ctrl){
		this.Dialog.AddControl(ctrl);
	}
	Modal.prototype.RemoveControl = function(ctrl){
		this.Dialog.RemoveControl(ctrl);
	}
	
	let TemplateHeaderBody = function(isModal){
		let dlg = isModal ? new Modal() : new Dialog();
		let title = dlg.Title || dlg.Dialog.Title;
		title.ClassName = "dialogutil_header";
		let body = new DialogPanelControl();
		body.ClassName = "dialogutil_body";
		
		dlg.AddControl(body);
		
		dlg.Header = title;
		dlg.Body = body;
		return dlg;
	}
	let TemplateBasicAlert = function(isModal){
		let dlg = TemplateHeaderBody(isModal);
		let msg = new DialogHtmlControl();
		dlg.SetMessage = function(m){
			msg.Html = m;
		}
		dlg.SetTitle = function(m){
			dlg.Header.Text = m;
		}
		dlg.Body.AddControl(msg);
		
	   dlg.Events.BindEvent("OnShow", function(){
		  let d = (dlg instanceof Modal ? dlg.Dialog : dlg);
		  d.DomNode.style.position = "fixed";
		  d.DomNode.style.left = "";
		  d.DomNode.style.top = "";
	   });
	   
		return dlg;
	}
	let TemplateHeaderBodyFooter = function(isModal){
		let dlg = TemplateHeaderBody(isModal);
		let footer = new DialogPanelControl();
		footer.ClassName = "dialogutil_footer";
		dlg.Footer = footer;
		dlg.AddControl(footer);
		return dlg;
	}
	
	let TemplateConfirmCancel = function(isModal){
		let dlg = TemplateHeaderBodyFooter(isModal);
		let confirmBtn = new DialogUtil.ButtonControl();
		let cancelBtn = new DialogUtil.ButtonControl();
		let message = new DialogUtil.HtmlControl("");
	   confirmBtn.Text = "Confirm";
	   cancelBtn.Text = "Cancel";
	   dlg.ConfirmButton = confirmBtn;
	   dlg.CancelButton = cancelBtn;
	   dlg.SetTitle = function(title){
		   dlg.Header.Text = title;
	   }
	   dlg.SetMessage = function(msg){
		   message.Html = msg;
	   }
	   dlg.Body.AddControl(message);
	   dlg.Footer.AddControl(confirmBtn);
	   dlg.Footer.AddControl(cancelBtn);
	   dlg.Events.BindEvent("OnShow", function(){
		  let d = (dlg instanceof Modal ? dlg.Dialog : dlg);
		  d.DomNode.style.position = "fixed";
		  d.DomNode.style.left = "";
		  d.DomNode.style.top = "";
	   });
		return dlg;
	}
	
	DialogUtil.Dialog = Dialog;
	DialogUtil.Modal = Modal;
	DialogUtil.ButtonControl = DialogButtonControl;
	DialogUtil.HtmlControl = DialogHtmlControl;
	DialogUtil.PanelControl = DialogPanelControl;
	DialogUtil.InputControl =  DialogInputControl;
	DialogUtil.GenericControl = DialogGenericControl;
	DialogUtil.EventBinderFlags = EventBinderFlags;
	
	DialogUtil.Templates = {};
	DialogUtil.Templates.HeaderBodyFooter = TemplateHeaderBodyFooter;
	DialogUtil.Templates.HeaderBody=  TemplateHeaderBody;
	DialogUtil.Templates.BasicAlert = TemplateBasicAlert;
	DialogUtil.Templates.ConfirmCancel = TemplateConfirmCancel;
	
	return DialogUtil;
}());
