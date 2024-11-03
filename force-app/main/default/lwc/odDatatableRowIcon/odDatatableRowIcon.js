import { LightningElement, api } from 'lwc';
import { HIDDEN_TYPE_OPTIONS } from 'c/odDatatableConstants';

export default class OdDatatableRowIcon extends LightningElement {
  @api content;
  @api config;
  @api record;

  get showIcon() {
    let hidden = this.config.hidden;
    if (this.config.hidden && this.config.hiddenType === HIDDEN_TYPE_OPTIONS.RECORD.value) {
      hidden = this.record[this.config.hiddenConditionField];
    }

    return !hidden;
  }
}
