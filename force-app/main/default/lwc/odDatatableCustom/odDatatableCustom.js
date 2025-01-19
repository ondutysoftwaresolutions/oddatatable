import LightningDatatable from 'lightning/datatable';
import inputGenericTemplate from './inputGeneric.html';
import rowButtonTemplate from './rowButtonType.html';
import rowTooltipIconTemplate from './rowTooltipIcon.html';

export default class ODCustomDatatable extends LightningDatatable {
  static customTypes = {
    inputGeneric: {
      template: inputGenericTemplate,
      standardCellLayout: false,
      typeAttributes: [
        'fieldName',
        'type',
        'editable',
        'value',
        'recordId',
        'record',
        'isDeleted',
        'isNew',
        'config',
        'required',
      ],
    },
    rowButtonType: {
      template: rowButtonTemplate,
      standardCellLayout: false,
      typeAttributes: ['recordId', 'record', 'name', 'label', 'isDeleted', 'fieldName', 'hasChanges', 'config'],
    },
    rowTooltipIconType: {
      template: rowTooltipIconTemplate,
      standardCellLayout: false,
      typeAttributes: ['recordId', 'fieldName', 'type', 'value', 'config', 'record'],
    },
  };
}
