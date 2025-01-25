import { LightningElement, api, track, wire } from 'lwc';
import getRecordsRelatedList from '@salesforce/apex/OD_DatatableConfigEditorController.getRecordsRelatedList';
import getConfigurationRelatedList from '@salesforce/apex/OD_DatatableConfigEditorController.getConfigurationRelatedList';
import { notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import { reduceErrors } from 'c/odDatatableUtils';

export default class OdDatatableRelatedList extends LightningElement {
  @api recordId;
  @api relatedObjectApiName;
  @api fieldApiName;
  @api customMetadataName;

  @track data;

  _configurationJson;

  isLoading = true;
  errorMessage = false;

  // =================================================================
  // Wire methods
  // =================================================================
  // get the config
  @wire(getConfigurationRelatedList, { customMetadataName: '$customMetadataName' })
  _getConfiguration(result) {
    if (result.data) {
      this.errorMessage = false;

      this._configurationJson = result.data;
    } else if (result.error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(result.error);
    }
  }

  // get the data
  @wire(getRecordsRelatedList, {
    objectName: '$relatedObjectApiName',
    fieldApiName: '$fieldApiName',
    recordId: '$recordId',
    fields: '$_fieldsToQuery',
  })
  _getData(result) {
    if (result.data) {
      this.isLoading = false;
      this.errorMessage = false;

      this.data = result.data || [];
    } else if (result.error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(result.error);
    }
  }

  // =================================================================
  // Getter methods
  // =================================================================
  get configuration() {
    if (!this._configurationJson) {
      return undefined;
    }

    const result = JSON.parse(this._configurationJson);

    const columns = JSON.parse(result.columns.value);

    columns.forEach((col) => {
      if (col.typeAttributes.config.flowNavigateNext) {
        col.typeAttributes.config.flowNavigateNext = false;
      }
    });

    result.columns.value = JSON.stringify(columns);

    return result;
  }

  get _fieldsToQuery() {
    if (!this.configuration) {
      return undefined;
    }

    // get a list of the fields separated by comma and remove the last comma (move to method)
    let fieldsToReturn = JSON.parse(this.configuration.columns.value)
      .filter(
        (fld) =>
          (fld.typeAttributes && fld.typeAttributes.config && !fld.typeAttributes.config.isCustom) ||
          !fld.typeAttributes ||
          (fld.typeAttributes && !fld.typeAttributes.config),
      )
      .map((fld) => fld.fieldName)
      .join(',');

    fieldsToReturn = fieldsToReturn.endsWith(',') ? fieldsToReturn.slice(0, -1) : fieldsToReturn;

    return fieldsToReturn;
  }

  get masterDetailConfiguration() {
    return JSON.stringify({ masterDetailField1: { defaultValue: this.recordId, apiName: this.fieldApiName } });
  }

  // =================================================================
  // Handler methods
  // =================================================================
  handleAfterSave(e) {
    const recordIds = JSON.parse(JSON.stringify(e.detail.recordIds));

    recordIds.push({ recordId: this.recordId });

    notifyRecordUpdateAvailable(recordIds);
  }
}
