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
  RICH_TEXTAREA: 'rich_textarea',
  SELECT: 'picklist',
  STRING: 'string',
  TEXT: 'text',
  TEXTAREA: 'textarea',
  TOGGLE: 'toggle',
  URL: 'url',
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
};

export const YES_NO = {
  YES: 'Yes',
  NO: 'No',
};

export const EMPTY_STRING = '--empty--';

export const EVENTS = {
  ADD: 'add',
  CHANGE: 'change',
  DELETE: 'delete',
  UNDELETE: 'undelete',
};

export const DELETE_ICONS_CONFIGURATION = {
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
