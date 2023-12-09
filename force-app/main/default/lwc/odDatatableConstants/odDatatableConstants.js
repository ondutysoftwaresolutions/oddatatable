export const FIELD_TYPES = {
  ADDRESS: 'address',
  CHECKBOX: 'boolean',
  CURRENCY: 'currency',
  DATE: 'date',
  DATETIME: 'datetime',
  DOUBLE: 'double',
  EMAIL: 'email',
  ID: 'id',
  INTEGER: 'integer',
  LONG: 'long',
  LONG_TEXTAREA: 'long_textarea',
  LOOKUP: 'lookup',
  MULTISELECT: 'multipicklist',
  PERCENTAGE: 'percent',
  PHONE: 'phone',
  RADIO_BUTTON_TYPE: 'radioButtonType',
  RICH_TEXTAREA: 'rich_textarea',
  SELECT: 'picklist',
  STRING: 'string',
  TEXT: 'text',
  TEXTAREA: 'textarea',
  TOGGLE: 'toggle',
  URL: 'url',
  CUSTOM: 'custom',
};

export const TEXT_FIELDS = [
  FIELD_TYPES.ADDRESS,
  FIELD_TYPES.EMAIL,
  FIELD_TYPES.PHONE,
  FIELD_TYPES.STRING,
  FIELD_TYPES.TEXT,
  FIELD_TYPES.URL,
];

export const NUMERIC_FIELDS = [FIELD_TYPES.DOUBLE, FIELD_TYPES.INTEGER, FIELD_TYPES.LONG];

export const DATE_FIELDS = [FIELD_TYPES.DATE, FIELD_TYPES.DATETIME];

export const LOCAL_SIDE_SEARCH = [FIELD_TYPES.SELECT, FIELD_TYPES.MULTISELECT];

export const SERVER_SIDE_SEARCH = [FIELD_TYPES.LOOKUP];

export const FIELDS_STRING = [...TEXT_FIELDS, ...LOCAL_SIDE_SEARCH, ...SERVER_SIDE_SEARCH];

export const CUSTOM_TYPES = {
  SCREEN_FLOW: 'ScreenFlow',
};

export const BUTTON_TYPES = [CUSTOM_TYPES.SCREEN_FLOW];

export const FORMATTED_TYPE_TO_SHOW = {
  address: {
    label: 'Address',
  },
  boolean: {
    label: 'Checkbox',
  },
  currency: {
    label: 'Currency',
    precision: true,
  },
  date: {
    label: 'Date',
  },
  datetime: {
    label: 'Date/Time',
  },
  double: {
    label: 'Number',
    precision: true,
  },
  email: {
    label: 'Email',
  },
  id: {
    label: 'Id',
  },
  integer: {
    label: 'Integer',
    digits: true,
  },
  long: {
    label: 'Number',
    precision: true,
  },
  long_textarea: {
    label: 'Long Text Area',
    maxLength: true,
  },
  lookup: {
    label: 'Lookup',
    object: true,
  },
  multipicklist: {
    label: 'Picklist (Multi-Select)',
  },
  percent: {
    label: 'Percent',
    precision: true,
  },
  phone: {
    label: 'Phone',
  },
  rich_textarea: {
    label: 'Rich Text Area',
    maxLength: true,
  },
  picklist: {
    label: 'Picklist',
  },
  string: {
    label: 'Text',
    maxLength: true,
  },
  text: {
    label: 'Text',
    maxLength: true,
  },
  textarea: {
    label: 'Text Area',
    maxLength: true,
  },
  url: {
    label: 'URL',
    maxLength: true,
  },
  custom: {
    label: '',
    options: [
      {
        value: CUSTOM_TYPES.SCREEN_FLOW,
        label: 'Screen Flow',
        flow: true,
      },
    ],
  },
};

export const YES_NO = {
  YES: 'Yes',
  NO: 'No',
};

export const INLINE_FLOW = {
  INLINE: 'Inline',
  FLOW: 'Flow',
};

export const EMPTY_STRING = '--empty--';

export const EVENTS = {
  ADD: 'add',
  CHANGE: 'change',
  OPEN_FLOW: 'openFlow',
  DELETE: 'delete',
  UNDELETE: 'undelete',
};

export const ROW_BUTTON_TYPE = 'rowButtonType';

export const ROW_BUTTON_CONFIGURATION = {
  OPEN_FLOW: {
    action: EVENTS.OPEN_FLOW,
  },
  EDIT: {
    _editAction: EVENTS.CHANGE,
  },
  DELETE: {
    _deleteIcon: 'utility:delete',
    _deleteAction: EVENTS.DELETE,
    _deleteTooltip: 'Delete this record. If it is an input record, it will mark it as deleted',
  },
  UNDELETE: {
    _deleteIcon: 'utility:undelete',
    _deleteAction: EVENTS.UNDELETE,
    _deleteTooltip: 'Restore this record',
  },
};

export const FLOW_DATA_TYPES = [
  {
    value: 'String',
    label: 'Text',
  },
  {
    value: 'Number',
    label: 'Number',
  },
  {
    value: 'Boolean',
    label: 'Boolean',
  },
];
