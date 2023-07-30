import { LightningElement, api } from 'lwc';

export default class OdDatatableRowButton extends LightningElement {
  @api recordId;
  @api iconName;
  @api tooltip;
  @api name;
  @api label;
  @api isDeleted;
  @api disableIfDeleted;

  get isIconButton() {
    return this.iconName;
  }

  get cellClasses() {
    return `slds-align--absolute-center ${this.isDeleted ? 'deleted-record' : ''} ${
      this.disableIfDeleted && this.isDeleted ? '' : 'enabled'
    }`;
  }

  handleClick() {
    const event = new CustomEvent('rowaction', {
      composed: true,
      bubbles: true,
      cancelable: true,
      detail: {
        recordId: this.recordId,
        action: this.name,
      },
    });

    this.dispatchEvent(event);
  }
}
