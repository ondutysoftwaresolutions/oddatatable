import { LightningElement, api } from 'lwc';

export default class ODSpinner extends LightningElement {
  @api text;
  @api show;
  @api variant = 'brand';
  @api size = 'medium';
  @api relative = false;

  get spinnerContainerClasses() {
    return `slds-align--absolute-center slds-spinner_container${this.relative ? ' slds-is-relative' : ''}`;
  }
}
