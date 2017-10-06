
let DialogUtil = (()=> {
    let DialogUtil = {};
    let RegisteredDialogs = {};
    RegisteredDialogs.Register = dlg => {
		RegisteredDialogs[dlg.Guid] = dlg;
	}
    RegisteredDialogs.Unregister = dlg => {
		delete RegisteredDialogs[dlg.Guid];
	}
    RegisteredDialogs.Get = guid => RegisteredDialogs[guid]
    let OpenDialogs = new Map();
    OpenDialogs.Set = dlg => {
		if(OpenDialogs.has(dlg)){
			return -1;
		}
		let zIndex = OpenDialogs.GetMaxZIndex() + 1;
		OpenDialogs.set(dlg,zIndex);
		return zIndex;
	}
    OpenDialogs.Remove = dlg => {
		OpenDialogs.delete(dlg);
	}
    OpenDialogs.IsOpen = dlg => {
		if(OpenDialogs.has(dlg)){
			return true;
		}
		return false;
	}
    OpenDialogs.GetZIndex = dlg => {
		if(OpenDialogs.has(dlg)){
			return OpenDialogs.get(dlg);
		}
	}
    OpenDialogs.GetMaxZIndex = dlg => {
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
    ClassNames.CreateControlClass = ctrl => `dialogutil_control_${ctrl.ControlName.toLowerCase()}`

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
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            let r = Math.random()*16|0;
            let v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
	}

    class EventManager {
        constructor() {
            this.Events = {};
        }

        FireEvent(evt, data) {
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

        BindEvent(evt, action) {
            if (this.Events[evt] === undefined) {
                this.Events[evt] = [];
            }
            this.Events[evt].push(action);
        }

        UnbindEvent(evt, action) {
                if (this.Events[evt] !== undefined) {
                    let newArr = [];

                    for (let event of this.Events[evt]) {
                        if (event !== action) {
                            newArr.push(event);
                        }
                    }

                    this.Events[evt] = newArr;
                }
        }

        UnbindAll() {
            this.Events = {};
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

	class AnimationTimer {
		constructor(action,frequency){
			this.Id = -1;
			this.Action = action;
			this._frequency = frequency;
			this.OnStop = function (){}
		}
		Start(){
			this.Id = setInterval(this.Action,this.Frequency)
		}
		Stop(){
			if(this.Started){
				clearInterval(this.Id);
				this.Id = -1;
				this.OnStop();
			}
		}
		get Frequency(){
			return this._frequency;
		}
		set Frequency(val){
			this._frequency = val;
			if(this.Started){
				clearInterval(this.Id);
				this.Start();
			}
		}
		get Started(){
			return this.Id > -1;
		}
	}
	class FadeInTimer extends AnimationTimer {
		constructor(action,frequency){
			super(action,frequency);
		}
	}
	class FadeOutTimer extends AnimationTimer {
		constructor(action,frequency){
			super(action,frequency);
		}
	}
    class DialogControl {
        constructor(name) {
            this.Guid = GenerateGuid();
            this.ControlName = name;
            this.Visible = true;
            this.Events = new EventManager();
            this.Disabled = false;
            this.ClassName = "";
            this.Id = "";	
            this.DomNode = null;
            this.Controls = [];
			this._timer = null;
        }

        Dispose() {
            try{
                OpenDialogs.Remove(this.ParentDialog);
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

        BindEvent(flags) {
            let scope = this;
            if(flags.Action != null){
                this.Events.BindEvent(flags.EventName,flags.Action);
            }
            if(flags.DomEventName !== ""){
                let method = () => {
                    scope.Events.FireEvent(flags.EventName);
                }
                this.DomNode.addEventListener(flags.DomEventName, method, false);
                let token = new EventBinderToken(flags,method);
                return token;
            }
            return new EventBinderToken(flags,null);
        }

        UnbindEvent(token) {
            if(token.EventBinderFlags.Action != null){
                this.Events.UnbindEvent(token.EventBinderFlags.EventName,token.EventBinderFlags.Action);
            }
            if(token.EventBinderFlags.DomEventName !== undefined){
                this.DomNode.removeEventListener(token.EventBinderFlags.DomEventName, token.DomMethod, false);
            }		
        }

        Disable() {
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

        Enable() {
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

        Hide() {
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

        Show() {
            if(this.Visible === true){
                //return false;
            }
            let rtn = this.Events.FireEvent("OnShow");
            if(rtn === false){
                return false;
            }
            this.Visible = true;
            this.UpdateDom();
            return true;
        }

        FadeIn(duration) {
			if(this._timer){
				this._timer.Stop();
			}
			let scope = this;
            if(this.Visible === true){
                //return false;
            }
            duration = duration || 1000;
            let frames = (duration / 1000) * 30;
            let updateAmt = 1/frames;
            this.Show();
            this.DomNode.style.opacity = 0;
            let timer = new FadeInTimer(() =>{
                scope.DomNode.style.opacity = parseFloat(scope.DomNode.style.opacity) + updateAmt;
                if(+scope.DomNode.style.opacity >= 1){
                    timer.Stop();
                }
            },33);
			timer.OnStop = function(){
				scope.DomNode.style.opacity = 1;		
			}
			timer.Start();
			this._timer = timer;
            return true;
        }

        FadeOut(duration) {
			if(this._timer){
				this._timer.Stop();
			}
			let scope = this;
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
            let timer = new FadeOutTimer( () =>{
                scope.DomNode.style.opacity = parseFloat(this.DomNode.style.opacity) - updateAmt;
                if(+scope.DomNode.style.opacity <= 0){
					timer.Stop();
                }
            },33);
			timer.OnStop = function(){
				scope.DomNode.style.opacity = 0;
				scope.Hide();
				if(oldDisabled === false){
					scope.Enable();
				}				
			}
			timer.Start();
			this._timer = timer;
            return true;
        }

        UpdateDom(hierarchy=[]) {
            this.DomNode.id = this.Id;
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

            let newHierarchy = Array.from(hierarchy);
            newHierarchy.push(this);
            for(let ctrl of this.Controls){
                ctrl.UpdateDom(newHierarchy);
            }
        }

        AddControl(ctrl) {
            this.Controls.push(ctrl);
            if(ctrl.DomNode != null && this.DomNode != null){
                this.DomNode.appendChild(ctrl.DomNode);
                if(ctrl.Parent != null){
                    ctrl.Parent.RemoveControl(ctrl);
                }
                ctrl.Parent = this;
            }
        }

        RemoveControl(ctrl) {
            let idx = this.Controls.indexOf(ctrl);
            if(idx > -1){
                this.Controls.splice(idx,1);
                if(ctrl.DomNode != null && this.DomNode != null){
                    this.DomNode.removeChild(ctrl.DomNode);
                    ctrl.Parent = null;
                }
            }
        }

        get ParentDialog() {
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
    }

    class DialogTitleControl extends DialogControl{
        constructor() {
            let args = Array.from(arguments);
            args = ["DialogTitleControl"].concat(args);
            super(args[0]);	
            let scope = this;	
            scope.DomNode = document.createElement("div");
            scope.TitleTextControl = new DialogHtmlControl();
            scope.TitleTextControl.ClassName = "dialogutil_titletext";
            scope.CloseButton = new DialogButtonControl();
            scope.CloseButton.ClassName = "dialogutil_titleclosebutton";
            scope.CloseButton.Action = dlg => {
                if(dlg != null){
                    dlg.Hide();
                }			
            }
            let closeFlags = new EventBinderFlags("OnClose", () => {
                let dlg = scope.ParentDialog;
                dlg = RegisteredDialogs.Get(dlg.Guid);
                scope.CloseButton.Action(dlg);
            }, "click");
            scope.CloseButton.BindEvent(closeFlags);
            scope.AddControl( scope.TitleTextControl );
            scope.AddControl( scope.CloseButton );
        }

        get Text() {
			return this.TitleTextControl.Html;
		}

        set Text(val) {
			this.TitleTextControl.Html = val;
		}
    }
    //DialogTitleControl.prototype = Object.create(DialogControl.prototype);


    class DialogGenericControl extends DialogControl{
		constructor(node){
			let args = Array.from(arguments);
			args = ["DialogGenericControl"].concat(args);
			super(args[0]);		
			this.DomNode = node;
			this.Id = this.DomNode.id;
			this.ClassName = this.DomNode.className;
			this.Disabled = this.DomNode.disabled === "disabled" ? true : false;
		}
	}
    //DialogGenericControl.prototype = Object.create(DialogControl.prototype);

    class DialogButtonControl extends DialogControl{
        constructor() {
            let args = Array.from(arguments);
            args = ["DialogButton"].concat(args);
            super(args[0]);
            this.Text = "";
            this.DomNode = document.createElement("input");
            this.DomNode.type = "button";
        }

        UpdateDom() {
            this.DomNode.value = this.Text;
            DialogControl.prototype.UpdateDom.apply(this,arguments);
        }
    }
   // DialogButtonControl.prototype = Object.create(DialogControl.prototype);

    class DialogHtmlControl extends DialogControl{
        constructor(html) {
            let args = Array.from(arguments);
            args = ["DialogHtmlControl"].concat(args);
            super(args[0]);	
            this.DomNode = document.createElement("div");
            let _html = html || "";
            if(html instanceof HTMLElement){
                _html = html.outerHTML;
            }
            this.DomNode.innerHTML = _html;
            //Object.freeze(this.Controls);
        }

        UpdateDom() {
            DialogControl.prototype.UpdateDom.apply(this,arguments);
        }

        get Html() {
			return this.DomNode.innerHTML;
		}

        set Html(val) {
			this.DomNode.innerHTML = val;
		}
    }
    //DialogHtmlControl.prototype = Object.create(DialogControl.prototype);

    class DialogInputControl extends DialogGenericControl{
        constructor(input) {
            if(!input){
                input = document.createElement("input");
                input.type = "text";
            }
            if( (input instanceof HTMLInputElement) === false){
                throw Error("Element is not an HTMLInputElement");
            }
            super(input);
            this.ControlName = "DialogInput";
        }

        get Value() {
			return this.DomNode.value;
		}

        set Value(val) {
			this.DomNode.value = val;
		}

        get Type() {
			return this.DomNode.type;
		}

        set Type(val) {
			this.DomNode.type = val;
		}
    }
    //DialogInputControl.prototype = Object.create(DialogGenericControl.prototype);

    class DialogIframeControl extends DialogGenericControl{
        constructor() {
            let args = Array.from(arguments);
            args = ["DialogIframeControl"].concat(args);
			let iframe = document.createElement("iframe");
            super(iframe);
			this.ControlName = "DialogIframeControl";
            Object.freeze(this.Controls);
        }

        UpdateDom(hierarchy) {
            DialogControl.prototype.UpdateDom.call(this,[hierarchy]);
            if(!this.Source && !this.Html){
                this.DomNode.className += ` ${ClassNames.HIDDEN}`;
            }
        }

        get Source() {
			return this.DomNode.src;
		}

        set Source(val) {
			this.DomNode.src = "";
			this.DomNode.src = val;
			this.DomNode.removeAttribute("srcdoc");
		}

        get Html() {
			return this.DomNode.srcdoc;
		}

        set Html(val) {
			this.DomNode.srcdoc = val;
			this.DomNode.removeAttribute("src");
		}
    }
    //DialogIframeControl.prototype = Object.create(DialogControl.prototype);

    class DialogPanelControl extends DialogControl{
		constructor(){
			let args = Array.from(arguments);
			args = ["DialogPanelControl"].concat(args);
			super(args[0]);		
			this.DomNode = document.createElement("div");		
		}
	}
    //DialogPanelControl.prototype = Object.create(DialogControl.prototype);

    class DialogOptions {
		constructor(){
			this.Html = "";
			this.IframeSource = "";
			this.IsIframe = false;
			this.IsModal = false;
		}
	}

    class Dialog extends DialogControl{
        constructor(opts=new DialogOptions()) {
            let args = Array.from(arguments);
            args = ["Dialog"].concat(args);
            super(args[0]);
            let scope = this;
            scope.DomNode = document.createElement("div");
            scope.Visible = false;
            scope.Draggable = true;
            
            this.Title = new DialogTitleControl();
            this.AddControl(this.Title);	

            if(opts.IsIframe == true){
                this.Iframe = new DialogIframeControl();
                if(opts.IframeSource){
                    this.Iframe.Source = opts.IframeSource;
                } 
                else if(opts.Html){
                    this.Iframe.Html = opts.Html;
                }
                this.AddControl(this.Iframe);
            }		
            
            let _mousedown = false;
            let _mousedownOffset = null;
            let _mousedownPt = null;
            
            if(opts.Html && opts.IsIframe == false){
                let ctrl = new DialogHtmlControl(opts.Html);
                this.AddControl(ctrl);
            }
            
            scope.DomNode.addEventListener("mousedown", e => {
                _mousedown = true;
                _mousedownPt = new Point(e.pageX,e.pageY);
                _mousedownOffset = getPos(scope.DomNode);
            },false);
            scope.DomNode.addEventListener("mouseup", e => {
                _mousedown = false;
            },false);
            scope.DomNode.addEventListener("mousemove", e => {
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
                scope.DomNode.style.left = `${pos.X}px`;
                scope.DomNode.style.top = `${pos.Y}px`;
            },false);
            
            RegisteredDialogs.Register(this);
			//this.Initialize();
        }

        Initialize(elm) {
            this.UpdateDom([this]);
            this.DomNode.remove();
            if(elm != null){
                elm.appendChild(this.DomNode);
            } else {
                document.body.appendChild(this.DomNode);
            }
        }

        Show() {
            let ok = DialogControl.prototype.Show.call(this,[]);
            if(!ok){
                return false;
            }
            let zIndex = OpenDialogs.Set(this);
            this.DomNode.style.zIndex = zIndex + 100000;
            this.DomNode.style.opacity = 1;
            return true;
        }

        Hide() {
            let ok = DialogControl.prototype.Hide.call(this,[]);
            if(!ok){
                return false;
            }
            OpenDialogs.Remove(this);
            this.DomNode.style.zIndex = -1;
            this.DomNode.style.opacity = 0;
            return true;
        }
		
        FadeOut(duration) {
            let ok = DialogControl.prototype.FadeOut.call(this,[duration]);
            if(!ok){
                return false;
            }
            OpenDialogs.Remove(this);
            return true;
        }
		SetTitle(title){
			this.Title.Text = title;
		}
        IsOpen() {
            return OpenDialogs.IsOpen(this);
        }
    }
    //Dialog.prototype = Object.create(DialogControl.prototype);

    class Modal extends Dialog{
        constructor(opts=new DialogOptions()) {
            let dialog = new Dialog(opts);
            let args = Array.from(arguments);
            args = ["Modal"].concat(args);
            super(arguments);
            this.Dialog = dialog;
            this.DomNode = document.createElement("div");
            this.Guid = dialog.Guid;
            this.ControlName = "Modal";
            dialog.Draggable = true;
            dialog.Visible = true;
            this.Draggable = false;

            this.Controls.push(dialog);
            this.DomNode.appendChild(this.Dialog.DomNode);
            //Object.freeze(this.Controls);
            //Object.freeze(this.Dialog);

            delete this.Title;
			delete this.Iframe;

            RegisteredDialogs.Register(this);
        }

        AddControl(ctrl) {
			if(this.Dialog){
				this.Dialog.AddControl(ctrl);
			}
        }
        RemoveControl(ctrl) {
            this.Dialog.RemoveControl(ctrl);
        }
		SetTitle(title){
			this.Dialog.SetTitle(title);
		}
    }
    //Modal.prototype = Object.create(Dialog.prototype);

    let TemplateHeaderBody = opts => {
		opts = opts || new DialogOptions();
		let dlg = opts.IsModal ? new Modal(opts) : new Dialog(opts);
		let title = dlg.Title || dlg.Dialog.Title;
		title.ClassName = "dialogutil_header";
		let body = new DialogPanelControl();
		body.ClassName = "dialogutil_body";
		
		dlg.AddControl(body);
		
		dlg.Header = title;
		dlg.Body = body;
		return dlg;
	}
    let TemplateBasicAlert = opts => {
		opts = opts || new DialogOptions();
		let dlg = TemplateHeaderBody(opts);
		let msg = new DialogHtmlControl();
		dlg.MessageControl = msg;
		dlg.SetMessage = m => {
			msg.Html = m;
		}
		dlg.Body.AddControl(msg);
		
	   dlg.Events.BindEvent("OnShow", () => {
		  let d = (dlg instanceof Modal ? dlg.Dialog : dlg);
		  d.DomNode.style.position = "fixed";
		  d.DomNode.style.left = "";
		  d.DomNode.style.top = "";
	   });
	   
		return dlg;
	}
    let TemplateHeaderBodyFooter = opts => {
		opts = opts || new DialogOptions();
		let dlg = TemplateHeaderBody(opts);
		let footer = new DialogPanelControl();
		footer.ClassName = "dialogutil_footer";
		dlg.Footer = footer;
		dlg.AddControl(footer);
		return dlg;
	}

    let TemplateConfirmCancel = opts => {
		opts = opts || new DialogOptions();
		let dlg = TemplateHeaderBodyFooter(opts);
		let confirmBtn = new DialogUtil.ButtonControl();
		let cancelBtn = new DialogUtil.ButtonControl();
		let message = new DialogUtil.HtmlControl("");
	   confirmBtn.Text = "Confirm";
	   cancelBtn.Text = "Cancel";
	   dlg.ConfirmButton = confirmBtn;
	   dlg.CancelButton = cancelBtn;
	   dlg.SetMessage = msg => {
		   message.Html = msg;
	   }
	   dlg.Body.AddControl(message);
	   dlg.MessageControl = message;
	   dlg.Footer.AddControl(confirmBtn);
	   dlg.Footer.AddControl(cancelBtn);
	   dlg.Events.BindEvent("OnShow", () => {
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
    DialogUtil.IframeControl = DialogIframeControl;
    DialogUtil.GenericControl = DialogGenericControl;
    DialogUtil.EventBinderFlags = EventBinderFlags;
    DialogUtil.DialogOptions = DialogOptions;
	DialogUtil.OpenDialogs = OpenDialogs;
	DialogUtil.EmptyDialog = function(name){
		let dlg = new Dialog(name);
		for(let ctrl of dlg.Controls){
			dlg.RemoveControl(ctrl);
		}
		return dlg;
	}
	DialogUtil.EmptyModal = function(name){
		let dlg = new Modal(name);
		for(let ctrl of dlg.Dialog.Controls){
			dlg.RemoveControl(ctrl);
		}
		return dlg;
	}

    DialogUtil.Templates = {};
    DialogUtil.Templates.HeaderBodyFooter = TemplateHeaderBodyFooter;
    DialogUtil.Templates.HeaderBody=  TemplateHeaderBody;
    DialogUtil.Templates.BasicAlert = TemplateBasicAlert;
    DialogUtil.Templates.ConfirmCancel = TemplateConfirmCancel;

    return DialogUtil;
})();
