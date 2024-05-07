import { LightningElement, api } from 'lwc';

export default class OdDatatableRowButton extends LightningElement {
  @api recordId;
  @api iconName;
  @api tooltip;
  @api name;
  @api label;
  @api fieldName;
  @api isDeleted;
  @api hasChanges;

  get isIconButton() {
    return this.iconName;
  }

  get cellClasses() {
    return `slds-align--absolute-center ${this.isDeleted ? 'deleted-record' : ''} ${
      this.hasChanges ? 'disabled' : 'enabled'
    }`;
  }

  handleClick() {
    const event = new CustomEvent('rowaction', {
      composed: true,
      bubbles: true,
      cancelable: true,
      detail: {
        recordId: this.recordId,
        fieldName: this.fieldName,
        action: this.name,
      },
    });

    this.dispatchEvent(event);
  }
}
