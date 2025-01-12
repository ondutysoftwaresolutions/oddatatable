import { LightningElement, api } from 'lwc';
import { EVENTS, HIDDEN_TYPE_OPTIONS, ROW_BUTTON_CONFIGURATION } from 'c/odDatatableConstants';

export default class OdDatatableRowButton extends LightningElement {
  @api recordId;
  @api name;
  @api label;
  @api fieldName;
  @api isDeleted;
  @api hasChanges;
  @api config;
  @api record;

  get isIconButton() {
    return this.theIconName;
  }

  get theIconName() {
    return this.config.isButtonIcon
      ? this.config.iconName
      : this.isDelete
        ? ROW_BUTTON_CONFIGURATION.DELETE.iconName
        : this.isUndelete
          ? ROW_BUTTON_CONFIGURATION.UNDELETE.iconName
          : undefined;
  }

  get theTooltip() {
    return this.config.isButtonIcon
      ? this.config.tooltip
      : this.isDelete
        ? ROW_BUTTON_CONFIGURATION.DELETE.tooltip
        : this.isUndelete
          ? ROW_BUTTON_CONFIGURATION.UNDELETE.tooltip
          : undefined;
  }

  get iconVariant() {
    return this.config.isButtonIcon ? this.config.buttonIconVariant || 'border' : 'bare';
  }

  get cellClassesToUse() {
    const disableClass = !this.isDelete && !this.isUndelete && this.hasChanges ? 'disabled' : 'enabled';
    return `rowButton ${this.config.cellClasses} ${this.isDeleted ? 'deleted-record' : ''} ${disableClass}`;
  }

  get showButton() {
    let hidden = this.config.hidden;
    if (this.config.hidden && this.config.hiddenType === HIDDEN_TYPE_OPTIONS.RECORD.value) {
      hidden = this.record[this.config.hiddenConditionField];
    }

    return !hidden;
  }

  get isDelete() {
    return this.name === EVENTS.DELETE;
  }

  get isUndelete() {
    return this.name === EVENTS.UNDELETE;
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
