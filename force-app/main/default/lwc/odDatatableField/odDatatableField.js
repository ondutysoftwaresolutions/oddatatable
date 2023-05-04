import { LightningElement, api } from 'lwc';
import { EVENTS } from 'c/odDatatableConstants';

export default class OdDatatableField extends LightningElement {
  @api recordId;
  @api type;
  @api editable;
  @api fieldName;
  @api value;
  @api isDeleted;
  @api isNew;
  @api config;
  @api required;

  get isEditable() {
    return this.editable && !this.isDeleted;
  }

  get defaultValue() {
    return this.isNew ? this.config.defaultValue : undefined;
  }

  get cellClasses() {
    return this.isDeleted ? 'deleted-record' : '';
  }

  _doDispatch(type, detail) {
    const event = new CustomEvent('rowaction', {
      composed: true,
      bubbles: true,
      cancelable: true,
      detail: {
        recordId: this.recordId,
        value: detail.value,
        fieldName: this.fieldName,
        isValid: detail.isValid,
        action: type,
      },
    });

    this.dispatchEvent(event);
  }

  handleUpdateField(e) {
    this._doDispatch(EVENTS.CHANGE, e.detail);
  }
}
