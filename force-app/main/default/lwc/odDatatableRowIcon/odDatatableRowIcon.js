import { LightningElement, api } from 'lwc';
import { HIDDEN_TYPE_OPTIONS } from 'c/odDatatableConstants';
import OD_DatatableResource from '@salesforce/resourceUrl/OD_Datatable';

export default class OdDatatableRowIcon extends LightningElement {
  @api recordId;
  @api content;
  @api config;
  @api record;
  @api fieldName;
  @api type;

  showSrcIconTooltip = false;

  get showIcon() {
    if (this.record._isGroupRecord || this.isSummarizeRecord) {
      return false;
    }

    let hidden = this.config.hidden;
    if (this.config.hidden && this.config.hiddenType === HIDDEN_TYPE_OPTIONS.RECORD.value) {
      hidden = this.record[this.config.hiddenConditionField];
    }

    return !hidden;
  }

  get tooltipContent() {
    let result = this.content;

    if (result === 'true' || result === true) {
      result = this.config.label;
    }

    return result;
  }

  get sldsIcon() {
    return this.config.iconName.includes(':');
  }

  get srcIconName() {
    return `${OD_DatatableResource}/icons/${this.config.iconName}`;
  }

  get isSummarizeRecord() {
    return this.record._isSummarizeRecord;
  }

  get isGroupRecordCollapsibleCell() {
    return this.record._isGroupRecord && this.record._isCollapsible;
  }

  get classesSrcIconTooltip() {
    let classes = `slds-popover slds-popover_tooltip slds-is-absolute iconTooltip`;

    if (this.record._isFirst) {
      if (this.config.isLastColumn) {
        classes += ` slds-nubbin_right-top left`;
      } else {
        classes += ` slds-nubbin_left-top right`;
      }
    } else if (this.record._isLast) {
      if (this.config.isLastColumn) {
        classes += ` slds-nubbin_right-bottom top left`;
      } else {
        classes += ` slds-nubbin_left-bottom top right`;
      }
    } else {
      if (this.config.isLastColumn) {
        classes += ` slds-nubbin_right-top left`;
      } else {
        classes += ` slds-nubbin_left-top right`;
      }
    }

    return classes;
  }

  get classesNoIcon() {
    return this.record._isGroupRecord ? 'groupCell' : '';
  }

  get theConfig() {
    if (this.isSummarizeRecord) {
      const newConfig = JSON.parse(JSON.stringify(this.config));
      newConfig.cellClasses = 'slds-text-align--center';

      return newConfig;
    }

    return this.config;
  }

  handleToggleSrcIconTooltip() {
    this.showSrcIconTooltip = !this.showSrcIconTooltip;
  }
}
