import { LightningElement, api } from 'lwc';

export default class OdDatatableRowButton extends LightningElement {
  @api recordId;
  @api iconName;
  @api tooltip;
  @api name;

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
