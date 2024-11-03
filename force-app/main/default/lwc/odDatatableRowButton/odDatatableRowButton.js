import { LightningElement, api } from 'lwc';
import { EVENTS, HIDDEN_TYPE_OPTIONS } from 'c/odDatatableConstants';

export default class OdDatatableRowButton extends LightningElement {
  @api recordId;
  @api iconName;
  @api tooltip;
  @api name;
  @api label;
  @api fieldName;
  @api isDeleted;
  @api hasChanges;
  @api config;
  @api record;

  get isIconButton() {
    return this.iconName;
  }

  get cellClassesToUse() {
    const disableClass =
      this.name !== EVENTS.DELETE && this.name !== EVENTS.UNDELETE && this.hasChanges ? 'disabled' : 'enabled';
    return `rowButton ${this.config.cellClasses} ${this.isDeleted ? 'deleted-record' : ''} ${disableClass}`;
  }

  get showButton() {
    let hidden = this.config.hidden;
    if (this.config.hidden && this.config.hiddenType === HIDDEN_TYPE_OPTIONS.RECORD.value) {
      hidden = this.record[this.config.hiddenConditionField];
    }

    return !hidden;
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
