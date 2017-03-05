/* Overrides */
$(document).ready(function(){
	
	function createConfirmCancel(id){
		let dlgC = new DialogUtil.Templates.ConfirmCancel({IsModal:true});
		dlgC.Id = id;
		dlgC.MessageControl.ClassName = "dialogutil-alert-msg";
		dlgC.SetTitle("Confirm");
			dlgC.ConfirmButton.BindEvent({
				EventName:"OnConfirm", 
				Action: function(){
					dlgC._onConfirm();
					dlgC.FadeOut(250);
				},
				DomEventName:"click"
			});
			dlgC.CancelButton.BindEvent({
				EventName:"OnCancel", 
				Action: function(){
					dlgC._onCancel();
					dlgC.FadeOut(250);
				},
				DomEventName:"click"
			});
		dlgC.Initialize();
		dlgC._confirm = function(opts){
			dlgC._onConfirm = function(){ 
				throw new Error("Confirm called without OnConfirm event");
			}
			dlgC._onCancel = opts.OnCancel || function(){}
			if(opts.ConfirmText){
				dlgC.ConfirmButton.Text = opts.ConfirmText;
			} else {
				dlgC.ConfirmButton.Text = "Ok";
			}
			if(opts.CancelText){
				dlgC.CancelButton.Text = opts.CancelText;
			} else {
				dlgC.CancelButton.Text = "Cancel";
			}
			if(dlgC.IsOpen()){
				 throw new Error("Confirm already dispatched");
			}
			if(opts.Title){
				dlgC.SetTitle(opts.Title);
			} else {
				dlgC.SetTitle("Confirm");
			}
			if(opts.Message){
				dlgC.SetMessage(opts.Message);
			} else {
				dlgC.SetMessage("");
			}
			if(opts.OnConfirm){
				dlgC._onConfirm = opts.OnConfirm;
			}


			dlgC.FadeIn(250);
		}
		   return dlgC;
	}
	
	function createPrompt(id){
		let dlgC = new DialogUtil.Templates.ConfirmCancel({IsModal:true});
		dlgC.Id = id;
		dlgC.MessageControl.ClassName = "dialogutil-alert-msg";
		dlgC.SetTitle("Prompt");
		let input = new DialogUtil.InputControl();
		dlgC.Body.AddControl(input);
			dlgC.ConfirmButton.BindEvent({
				EventName:"OnConfirm", 
				Action: function(){
					dlgC._onConfirm(input.Value);
					dlgC.FadeOut(250);
				},
				DomEventName:"click"
			});
			dlgC.CancelButton.BindEvent({
				EventName:"OnCancel", 
				Action: function(){
					dlgC._onCancel();
					dlgC.FadeOut(250);
				},
				DomEventName:"click"
			});
		dlgC.Initialize();
		dlgC._confirm = function(opts){
			if(opts.DefaultValue){
				input.Value = opts.DefaultValue;
			} else {
				input.Value = "";
			}
			dlgC._onConfirm = function(){ 
				throw new Error("Confirm called without OnConfirm event");
			}
			dlgC._onCancel = opts.OnCancel || function(){}
			if(opts.ConfirmText){
				dlgC.ConfirmButton.Text = opts.ConfirmText;
			} else {
				dlgC.ConfirmButton.Text = "Ok";
			}
			if(opts.CancelText){
				dlgC.CancelButton.Text = opts.CancelText;
			} else {
				dlgC.CancelButton.Text = "Cancel";
			}
			if(dlgC.IsOpen()){
				 throw new Error("Prompt already dispatched");
			}
			if(opts.Title){
				dlgC.SetTitle(opts.Title);
			} else {
				dlgC.SetTitle("Prompt");
			}
			if(opts.Message){
				dlgC.SetMessage(opts.Message);
			} else {
				dlgC.SetMessage("");
			}
			if(opts.OnConfirm){
				dlgC._onConfirm = opts.OnConfirm;
			}


			dlgC.FadeIn(250);
		}
		   return dlgC;
	}
	
	window.ORIGINAL_METHODS = {};
	let a = window.alert;
	window.ORIGINAL_METHODS.alert = a;
	let dlg = new DialogUtil.Templates.BasicAlert({IsModal:true});
	dlg.Id = "basic-alert";
	dlg.MessageControl.ClassName = "dialogutil-alert-msg";
	dlg.SetTitle("Alert!");
	dlg.Initialize();
	window.alert = function(msg, title){
		if(dlg.IsOpen()){
			throw new Error("Alert already dispatched");
			return;
		}
		dlg.SetMessage(msg);
		if(title){
			dlg.SetTitle(title);
		} else {
			dlg.SetTitle("Alert!");
		}
		dlg.FadeIn(250);
	}
	
	let c = window.confirm;
	window.ORIGINAL_METHODS.confirm = c;
	let dlgC = createConfirmCancel("basic-confirm");
    window.confirm = dlgC._confirm;
	
    let p = window.prompt;
	window.ORIGINAL_METHODS.prompt = p;
    let dlgP = createPrompt("basic-prompt");
	window.prompt = dlgP._confirm;
	
	
});
