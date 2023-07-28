import { LightningElement, api } from 'lwc';

export default class Popup extends LightningElement {
  @api showSpinner = false;
  @api showError = false;
  @api hideTitleClose = false;
  @api spinnerMessage = ' ';
  @api containerClasses = '';
  @api hideTitle = false;
  @api hideFooter = false;
  @api backdropClasses;

  get modalContainerClasses() {
    return `slds-modal__container ${this.containerClasses}`;
  }

  get modalBackdropClasses() {
    return `slds-backdrop slds-backdrop_open modalBackdrops ${this.backdropClasses}`;
  }

  get style() {
    return this.hideTitle ? 'padding: 0; border: 0' : '';
  }

  handleClose() {
    const closeEvent = new CustomEvent('close');

    this.dispatchEvent(closeEvent);
  }
}
