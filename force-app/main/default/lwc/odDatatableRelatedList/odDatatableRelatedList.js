import { LightningElement, api, track, wire } from 'lwc';
import getRecordsRelatedList from '@salesforce/apex/OD_DatatableRecordsController.getRecordsRelatedList';
import getConfigurationRelatedList from '@salesforce/apex/OD_DatatableConfigurationController.getConfigurationRelatedList';
import { notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import { generateRandomString, reduceErrors } from 'c/odDatatableUtils';
import { GROUPING_SOURCE, SHARING_CONTEXT, SORT_DIRECTION, YES_NO } from 'c/odDatatableConstants';

export default class OdDatatableRelatedList extends LightningElement {
  @api recordId;
  @api relatedObjectApiName;
  @api fieldApiName;
  @api customMetadataName;

  @track data;
  @track _configuration;

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

      this._configuration = this._buildConfiguration(JSON.parse(result.data));
    } else if (result.error) {
      this.isLoading = false;
      this.errorMessage = reduceErrors(result.error);
    }
  }

  // get the data
  @wire(getRecordsRelatedList, {
    withSharing: '$_withSharing',
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
  get _fieldsToQuery() {
    if (!this._configuration) {
      return undefined;
    }

    // get a list of the fields separated by comma and remove the last comma (move to method)
    let fieldsToReturn = JSON.parse(this._configuration.columns.value)
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

  get _withSharing() {
    if (!this._configuration) {
      return undefined;
    }

    return this._configuration.sharingContext.value === SHARING_CONTEXT.WITH_SHARING;
  }

  get masterDetailConfiguration() {
    return JSON.stringify({ masterDetailField1: { defaultValue: this.recordId, apiName: this.fieldApiName } });
  }

  get uniqueTableName() {
    return this._configuration.uniqueTableName ? this._configuration.uniqueTableName.value : generateRandomString();
  }

  get objectName() {
    return this._configuration.objectName ? this._configuration.objectName.value : '';
  }

  get columns() {
    return this._configuration.columns ? this._configuration.columns.value : '{}';
  }

  get noRecordsMessage() {
    return this._configuration.noRecordsMessage ? this._configuration.noRecordsMessage.value : '';
  }

  get showRowNumberColumn() {
    return this._configuration.showRowNumberColumn ? this._configuration.showRowNumberColumn.value : YES_NO.NO;
  }

  get canAdd() {
    return this._configuration.canAdd ? this._configuration.canAdd.value : YES_NO.NO;
  }

  get addLabel() {
    return this._configuration.addLabel ? this._configuration.addLabel.value : 'Add';
  }

  get addType() {
    return this._configuration.addType ? this._configuration.addType.value : '';
  }

  get addFlowName() {
    return this._configuration.addFlowName ? this._configuration.addFlowName.value : '';
  }

  get addFlowInputVariables() {
    return this._configuration.addFlowInputVariables ? this._configuration.addFlowInputVariables.value : '';
  }

  get canEdit() {
    return this._configuration.canEdit ? this._configuration.canEdit.value : YES_NO.NO;
  }

  get editType() {
    return this._configuration.editType ? this._configuration.editType.value : '';
  }

  get editLabel() {
    return this._configuration.editLabel ? this._configuration.editLabel.value : 'Edit';
  }

  get editFlowName() {
    return this._configuration.editFlowName ? this._configuration.editFlowName.value : '';
  }

  get editFlowInputVariables() {
    return this._configuration.editFlowInputVariables ? this._configuration.editFlowInputVariables.value : '';
  }

  get canDelete() {
    return this._configuration.canDelete ? this._configuration.canDelete.value : YES_NO.NO;
  }

  get canBulkDelete() {
    return this._configuration.canBulkDelete ? this._configuration.canBulkDelete.value : YES_NO.NO;
  }

  get bulkDeleteLabel() {
    return this._configuration.bulkDeleteLabel ? this._configuration.bulkDeleteLabel.value : 'Delete';
  }

  get canBulkEdit() {
    return this._configuration.canBulkEdit ? this._configuration.canBulkEdit.value : YES_NO.NO;
  }

  get bulkEditLabel() {
    return this._configuration.bulkEditLabel ? this._configuration.bulkEditLabel.value : 'Bulk Edit';
  }

  get canSelect() {
    return this._configuration.canSelect ? this._configuration.canSelect.value : YES_NO.NO;
  }

  get selectionType() {
    return this._configuration.selectionType ? this._configuration.selectionType.value : '';
  }

  get selectionRequired() {
    return this._configuration.selectionRequired ? this._configuration.selectionRequired.value : YES_NO.NO;
  }

  get inlineSave() {
    return this._configuration.inlineSave ? this._configuration.inlineSave.value : YES_NO.NO;
  }

  get saveLabel() {
    return this._configuration.saveLabel ? this._configuration.saveLabel.value : 'Save';
  }

  get saveAllOrNone() {
    return this._configuration.saveAllOrNone ? this._configuration.saveAllOrNone.value : YES_NO.YES;
  }

  get listenToPlatformEvent() {
    return this._configuration.listenToPlatformEvent ? this._configuration.listenToPlatformEvent.value : YES_NO.NO;
  }

  get platformEventMatchingFieldName() {
    return this._configuration.platformEventMatchingFieldName
      ? this._configuration.platformEventMatchingFieldName.value
      : '';
  }

  get platformEventMatchingId() {
    return this._configuration.platformEventMatchingId ? this._configuration.platformEventMatchingId.value : '';
  }

  get pagination() {
    return this._configuration.pagination ? this._configuration.pagination.value : YES_NO.NO;
  }

  get paginationAlignment() {
    return this._configuration.paginationAlignment ? this._configuration.paginationAlignment.value : '';
  }

  get pageSize() {
    return this._configuration.pageSize ? this._configuration.pageSize.value : 10;
  }

  get paginationShowOptions() {
    return this._configuration.paginationShowOptions ? this._configuration.paginationShowOptions.value : YES_NO.NO;
  }

  get grouping() {
    return this._configuration.grouping ? this._configuration.grouping.value : YES_NO.NO;
  }

  get groupingField() {
    return this._configuration.groupingField ? this._configuration.groupingField.value : '';
  }

  get groupSortField() {
    return this._configuration.groupSortField ? this._configuration.groupSortField.value : '';
  }

  get groupSortDirection() {
    return this._configuration.groupSortDirection
      ? this._configuration.groupSortDirection.value
      : SORT_DIRECTION.ASC.value;
  }

  get groupContentSortField() {
    return this._configuration.groupContentSortField ? this._configuration.groupContentSortField.value : '';
  }

  get groupContentSortDirection() {
    return this._configuration.groupContentSortDirection
      ? this._configuration.groupContentSortDirection.value
      : SORT_DIRECTION.ASC.value;
  }

  get groupingSource() {
    return this._configuration.groupingSource ? this._configuration.groupingSource.value : GROUPING_SOURCE.DATASET;
  }

  get groupingSourceFieldData() {
    return this._configuration.groupingSourceFieldData ? this._configuration.groupingSourceFieldData.value : '';
  }

  get showEmptyGroups() {
    return this._configuration.showEmptyGroups ? this._configuration.showEmptyGroups.value : YES_NO.NO;
  }

  get canCollapseGroups() {
    return this._configuration.canCollapseGroups ? this._configuration.canCollapseGroups.value : YES_NO.NO;
  }

  get showTotalsByGroup() {
    return this._configuration.showTotalsByGroup ? this._configuration.showTotalsByGroup.value : YES_NO.NO;
  }

  get recalculateLive() {
    return this._configuration.recalculateLive ? this._configuration.recalculateLive.value : YES_NO.NO;
  }

  get canExport() {
    return this._configuration.canExport ? this._configuration.canExport.value : YES_NO.NO;
  }

  get exportGroups() {
    return this._configuration.exportGroups ? this._configuration.exportGroups.value : YES_NO.NO;
  }

  get exportFileName() {
    return this._configuration.exportFileName ? this._configuration.exportFileName.value : '';
  }

  get sharingContext() {
    return this._configuration.sharingContext
      ? this._configuration.sharingContext.value
      : SHARING_CONTEXT.WITHOUT_SHARING;
  }

  // =================================================================
  // Private methods
  // =================================================================
  _buildConfiguration(config) {
    if (!config) {
      return undefined;
    }

    const columns = JSON.parse(config.columns.value);

    columns.forEach((col) => {
      if (col.typeAttributes.config.flowNavigateNext) {
        col.typeAttributes.config.flowNavigateNext = false;
      }
    });

    config.columns.value = JSON.stringify(columns);

    return config;
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
