import { LightningElement, api } from 'lwc';

export default class ODError extends LightningElement {
  @api errorMessage;
  @api errorType = 'error';

  get classNames() {
    return `slds-notify slds-notify_alert slds-theme_alert-texture sticky slds-theme_${this.errorType}`;
  }
}
