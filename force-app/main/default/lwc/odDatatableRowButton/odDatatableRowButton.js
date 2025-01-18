import { LightningElement, api } from 'lwc';
import { BUTTON_VARIANTS, EVENTS, HIDDEN_TYPE_OPTIONS, ROW_BUTTON_CONFIGURATION } from 'c/odDatatableConstants';

export default class OdDatatableRowButton extends LightningElement {
  @api recordId;
  @api name;
  @api label;
  @api fieldName;
  @api isDeleted;
  @api hasChanges;
  @api config;
  @api record;

  get cellClassesToUse() {
    const disableClass =
      !this._isDelete &&
      !this._isUndelete &&
      !this.record?._isGroupRecord &&
      !this.record?._isSummarizeRecord &&
      this.hasChanges
        ? 'disabled'
        : 'enabled';

    return `rowButton ${this.config.cellClasses} ${this.isDeleted ? 'deleted-record' : ''} ${disableClass} ${this._isGroupRecord ? 'groupCell alignItemsCenter slds-grid' : ''} ${this._isSummarizeRecord ? 'summarizeCell' : ''}`;
  }

  get showButton() {
    if (this._isSummarizeRecord) {
      return false;
    }

    let hidden = this.config.hidden;
    if (this.config.hidden && this.config.hiddenType === HIDDEN_TYPE_OPTIONS.RECORD.value) {
      hidden = this.record[this.config.hiddenConditionField];
    }

    return !hidden;
  }

  get isButtonIcon() {
    return this._isGroupRecord ? false : this.config.isButtonIcon;
  }

  get theIconName() {
    if (this.config.iconName) {
      return this.config.iconName;
    }

    if (this._isDelete) {
      return ROW_BUTTON_CONFIGURATION.DELETE.iconName;
    }

    if (this._isUndelete) {
      return ROW_BUTTON_CONFIGURATION.UNDELETE.iconName;
    }

    if (this._isGroupRecord && this.record._isCollapsed) {
      return ROW_BUTTON_CONFIGURATION.GROUP_EXPAND.iconName;
    }

    if (this._isGroupRecord && !this.record._isCollapsed) {
      return ROW_BUTTON_CONFIGURATION.GROUP_COLLAPSE.iconName;
    }

    return undefined;
  }

  get iconVariant() {
    return this.config.isButtonIcon ? this.config.buttonIconVariant || 'border' : 'bare';
  }

  get theTooltip() {
    if (this.config.tooltip) {
      return this.config.tooltip;
    }

    if (this._isDelete) {
      return ROW_BUTTON_CONFIGURATION.DELETE.tooltip;
    }

    if (this._isUndelete) {
      return ROW_BUTTON_CONFIGURATION.UNDELETE.tooltip;
    }

    return undefined;
  }

  get theLabelForButton() {
    if (this._isGroupRecord) {
      return this.config.isFirstColumn ? this.label : '';
    }

    return this.label;
  }

  get theIconNameForButton() {
    return this._isGroupRecord && this.config.isFirstColumn ? this.theIconName : undefined;
  }

  get theIconPositionForButton() {
    return this._isGroupRecord ? 'right' : 'left';
  }

  get theVariantForButton() {
    if (this._isGroupRecord) {
      return ROW_BUTTON_CONFIGURATION.GROUP_COLLAPSE.buttonVariant;
    }

    if (this.config.buttonVariant) {
      return this.config.buttonVariant;
    }

    return BUTTON_VARIANTS.find((btn) => btn.default).value;
  }

  get theClassesForButton() {
    return `btn-inside-table-row ${this._isGroupRecord ? 'slds-size--1-of-1' : ''}`;
  }

  get _isDelete() {
    return this.name === EVENTS.DELETE;
  }

  get _isUndelete() {
    return this.name === EVENTS.UNDELETE;
  }

  get _isGroupRecord() {
    return this.record._isGroupRecord;
  }

  get _isSummarizeRecord() {
    return this.record._isSummarizeRecord;
  }

  get _name() {
    if (this._isGroupRecord) {
      if (this.record._isCollapsed) {
        return ROW_BUTTON_CONFIGURATION.GROUP_EXPAND.action;
      }

      return ROW_BUTTON_CONFIGURATION.GROUP_COLLAPSE.action;
    }

    return this.name;
  }

  handleClick() {
    const event = new CustomEvent('rowaction', {
      composed: true,
      bubbles: true,
      cancelable: true,
      detail: {
        recordId: this.recordId,
        fieldName: this.fieldName,
        action: this._name,
      },
    });

    this.dispatchEvent(event);
  }
}
