/*************************************************************************************************************
 * @name			OD_DatatableService
 * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
 * @created			02 / 05 / 2023
 * @description		Service class with inherited sharing to be called by the OD_DatatableRecordsSharing or OD_DatatableRecordsNoSharing
 * @TestClass		OD_DatatableConfigEditorControllerTest, OD_DatatableRecordsControllerTest
 *
 * Changes (version)
 * -----------------------------------------------------------------------------------------------------------
 * 				No.		Date			Author					Description
 * 				----	------------	--------------------	----------------------------------------------
 * @version		1.0		2023-05-02		Pablo Martinez			Creation of the class
 *
 **************************************************************************************************************/
public inherited sharing class OD_DatatableService {
  /*********************************************************************************************************
   * @name			getMasterDetailFieldsForObject
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			08 / 05 / 2023
   * @description		Get a list of available master-detail fields for the object to use in the table
   * @param			String objectName : The name of the object to get the fields for
   * @return			List of the picklist options to use in the UI
   **********************************************************************************************************/
  public static List<OD_Datatable.PicklistOption> getMasterDetailFieldsForObject(String objectName) {
    List<OD_Datatable.PicklistOption> result = new List<OD_Datatable.PicklistOption>();

    // this is a list of objects where the Master Details fields don't return the getRelationshipOrder() different than null (Salesforce being Salesforce and breaking that rule)
    Set<String> standardObjectsMasterDetails = new Set<String>{ 'OpportunityLineItem', 'WorkOrderLineItem ' };

    try {
      // get the object give the string with the object name
      SObject objectInstance = (SObject) Type.forName(objectName).newInstance();

      // get the fields map for the object
      Map<String, Schema.SObjectField> fieldsMap = objectInstance.getSObjectType().getDescribe().fields.getMap();

      // for each field
      for (String fieldName : fieldsMap.keySet()) {
        Schema.DescribeFieldResult fieldResult = fieldsMap.get(fieldName).getDescribe();

        if (fieldResult.getReferenceTo().size() == 1 && !fieldResult.isDefaultedOnCreate()) {
          // check if it's a master detail by get relationship order
          if (fieldResult.getRelationshipOrder() != null || standardObjectsMasterDetails.contains(objectName)) {
            // add to the list
            result.add(new OD_Datatable.PicklistOption(fieldResult.getName(), fieldResult.getLabel()));
          }
        }
      }

      return result;
    } catch (Exception exc) {
      String message = 'ERROR while getting the master detail fields for the Object: ' + objectName + '.';
      AuraHandledException e = new AuraHandledException(message);
      e.setMessage(message);
      throw e;
    }
  }

  /*********************************************************************************************************
   * @name			getFieldsForObject
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of available fields for the object to use in the table
   * @param			String objectName : The name of the object to get the fields for
   * @return			List of the field wrapper to use in the UI
   **********************************************************************************************************/
  public static List<OD_Datatable.FieldWrapper> getFieldsForObject(String objectName) {
    List<OD_Datatable.FieldWrapper> result = new List<OD_Datatable.FieldWrapper>();

    try {
      // get the object give the string with the object name
      SObject objectInstance = (SObject) Type.forName(objectName).newInstance();

      // get the master detail fields for the object
      Set<String> masterDetailFields = new Set<String>();
      for (OD_Datatable.PicklistOption masterDetail : getMasterDetailFieldsForObject(objectName)) {
        masterDetailFields.add(masterDetail.value.toLowerCase());
      }

      // get the fields map for the object
      Map<String, Schema.SObjectField> fieldsMap = objectInstance.getSObjectType().getDescribe().fields.getMap();

      // for each field
      for (String fieldName : fieldsMap.keySet()) {
        Schema.DescribeFieldResult fieldResult = fieldsMap.get(fieldName).getDescribe();

        Boolean canEdit =
          !fieldResult.isCalculated() &&
          (fieldResult.isPermissionable() ||
          fieldResult.isNameField() ||
          !fieldResult.isNillable()) &&
          !fieldResult.isAutoNumber() &&
          !fieldResult.isQueryByDistance();

        // build the field wrapper
        OD_Datatable.FieldWrapper newField = new OD_Datatable.FieldWrapper();
        newField.value = fieldResult.getName();
        newField.label = fieldResult.getLabel();
        newField.type = fieldResult.getType().name().toLowercase();
        newField.defaultValue = fieldResult.getDefaultValue();
        newField.canEdit = canEdit;
        newField.maxLength = fieldResult.getLength();
        newField.isHTML = fieldResult.isHtmlFormatted();
        newField.digits = fieldResult.getDigits();
        newField.precision = fieldResult.getPrecision();
        newField.scale = fieldResult.getScale();
        newField.required = !fieldResult.isNillable();
        newField.canBeUsedInWhere = fieldResult.isFilterable();
        newField.isMasterDetail = masterDetailFields.contains(fieldName);
        newField.helpText = fieldResult.getInlineHelpText();

        // add the reference to if it's a lookup
        if (fieldResult.getReferenceTo().size() == 1) {
          newField.type = 'lookup';
          newField.parentObjectName = fieldResult.getReferenceTo()[0].getDescribe().getName();
          newField.parentObjectLabel = fieldResult.getReferenceTo()[0].getDescribe().getLabel();
        }

        // if it's a picklist
        if (fieldResult.getPicklistValues()?.size() > 0) {
          String valueDefault;
          for (PicklistEntry plEntry : fieldResult.getPicklistValues()) {
            // only add active picklist values
            if (plEntry.isActive()) {
              newField.options.add(new OD_Datatable.PicklistOption(plEntry.getValue(), plEntry.getLabel()));
            }

            // save the default value to send it to the UI
            if (plEntry.isDefaultValue()) {
              valueDefault = plEntry.getValue();
            }
          }

          // assign the default value if any
          if (valueDefault != null) {
            newField.defaultValue = valueDefault;
          }
        }

        // add to the list
        result.add(newField);
      }

      result.sort();

      return result;
    } catch (Exception exc) {
      String message = 'ERROR while getting the fields for the Object: ' + objectName + '.';
      AuraHandledException e = new AuraHandledException(message);
      e.setMessage(message);
      throw e;
    }
  }

  /*********************************************************************************************************
   * @name			getNameFieldForObject
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Private method to get the Name Field of the object, it supports a custom field from a Custom Label, otherwise it uses the Name or the name field found
   * @param			String objectName : The name of the object to get the name field for
   * @return			String with the API Name of the field name
   **********************************************************************************************************/
  private static String getNameFieldForObject(String objectName) {
    // get the schema
    Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objectName);
    Map<String, Schema.SObjectField> fieldMap = targetType.getDescribe().fields.getMap();

    // check for the name field (standard)
    String nameField = 'Name';

    if (!fieldMap.containsKey(nameField)) {
      // lastly search by the name field property (CaseNumber e.g.)
      for (Schema.SObjectField field : fieldMap.values()) {
        Schema.DescribeFieldResult fieldDescribe = field.getDescribe();

        if (fieldDescribe.isNameField()) {
          nameField = fieldDescribe.getName();
          break;
        }
      }
    }

    return nameField;
  }

  /*********************************************************************************************************
   * @name			getRecordsForLookup
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of picklist options from a record and return it to the UI
   * @param			String objectName : The name of the object to get the records for
   * @param			String searchText : The search text to look for
   * @param			String searchGroup : Search group to use (), if null ALL FIELDS will be used
   * @param			String displayField : The Display field to return, if null the Name field for the object will be used
   * @param			String whereCondition : The where condition to filter the results
   * @param			String orderCondition : The Order By Condition to filter the results
   * @param			Integer limitRecords : The number of records to return
   * @return			List of picklist options
   **********************************************************************************************************/
  public static List<OD_Datatable.PicklistOption> getRecordsForLookup(
    String objectName,
    String searchText,
    String searchGroup,
    String displayField,
    String whereCondition,
    String orderCondition,
    Integer limitRecords
  ) {
    try {
      List<OD_Datatable.PicklistOption> result = new List<OD_Datatable.PicklistOption>();

      String searchGroupToUse = String.isBlank(searchGroup) ? 'ALL FIELDS' : searchGroup;
      String nameField = String.isBlank(displayField) ? getNameFieldForObject(objectName) : displayField;
      String whereFilter = String.isBlank(whereCondition) ? '' : ' WHERE ' + whereCondition;
      String orderBy = String.isBlank(orderCondition) ? '' : ' ORDER BY ' + orderCondition;
      String limitToUse = limitRecords == null ? '' : ' LIMIT ' + limitRecords;
      String textToSearch = '*' + searchText.replace(' ', '* ') + '*';

      // perform the query
      String searchQuery =
        'FIND {' +
        textToSearch +
        '} IN ' +
        searchGroupToUse +
        ' RETURNING ' +
        objectName +
        '(Id, ' +
        nameField +
        whereFilter +
        orderBy +
        limitToUse +
        ')';

      List<List<SObject>> searchList = search.query(searchQuery);

      if (searchList?.size() > 0) {
        for (List<SObject> listObject : searchList) {
          for (SObject record : listObject) {
            result.add(new OD_Datatable.PicklistOption((String) record.get('Id'), (String) record.get(nameField)));
          }
        }
      }

      return result;
    } catch (Exception exc) {
      String message =
        'ERROR while getting the records for the Object: ' +
        objectName +
        ' and the text: ' +
        searchText +
        '.';
      AuraHandledException e = new AuraHandledException(message);
      e.setMessage(message);
      throw e;
    }
  }

  /*********************************************************************************************************
   * @name			getLookupRecord
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a picklist option for a record
   * @param			String objectName : The name of the object to get the record for
   * @param			String value : The Id of the record to look for
   * @param			String displayField : The Display field to return, if null the Name field for the object will be used
   * @return			Picklist option
   **********************************************************************************************************/
  public static OD_Datatable.PicklistOption getLookupRecord(String objectName, String value, String displayField) {
    try {
      // get the name field to return
      String nameField = String.isBlank(displayField) ? getNameFieldForObject(objectName) : displayField;

      // perform the query
      String searchQuery = 'SELECT Id, ' + nameField + ' FROM ' + objectName + ' WHERE Id = \'' + value + '\' LIMIT 1';

      List<SObject> searchList = Database.query(searchQuery);

      if (searchList?.size() > 0) {
        return new OD_Datatable.PicklistOption(value, (String) searchList[0].get(nameField));
      }

      return null;
    } catch (Exception exc) {
      String message = 'ERROR while getting the record for the Object: ' + objectName + ' and the Id: ' + value + '.';
      AuraHandledException e = new AuraHandledException(message);
      e.setMessage(message);
      throw e;
    }
  }

  /*********************************************************************************************************
   * @name			getRecords
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			03 / 08 / 2023
   * @description		Get the records after insert/update to return updated fields to the UI
   * @param			String objectName : The Name of the object to retrieve
   * @param			String fields : Comma separated field names to retrieve
   * @param			String fieldNameFilter : The field Name to use in the filter
   * @param			Set<Id> idsToQuery : Set of record ids to retrieve
   * @return			List of found records
   **********************************************************************************************************/
  public static List<SObject> getRecords(
    String objectName,
    String fields,
    String fieldNameFilter,
    List<Id> idsToQuery
  ) {
    // build the query
    String query = 'SELECT Id, UserRecordAccess.HasEditAccess, UserRecordAccess.HasDeleteAccess';

    // add fields if any
    if (String.isNotBlank(fields)) {
      query += ', ' + String.escapeSingleQuotes(fields);
    }

    query += ' FROM ' + objectName + ' WHERE ' + fieldNameFilter + ' IN :idsToQuery';

    SObjectAccessDecision securityDecision = Security.stripInaccessible(AccessType.READABLE, Database.query(query));

    return securityDecision.getRecords();
  }

  /*********************************************************************************************************
   * @name			saveRecords
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			27 / 07 / 2023
   * @description		Save the records (add, edit and delete) with error handling for each operation.
   *                  Returns a wrapper containing success status, successfully saved records, and
   *                  detailed error information for any failed operations including field-level errors.
   * @param			String objectName : The Name of the object to modify
   * @param			String fields : Comma separated field names to retrieve after insert/update
   * @param			String recordsToCreate : JSON string of the list of records to create
   * @param			String recordsToUpdate : JSON string of the list of records to update
   * @param			String recordsToDelete : JSON string of the list of records to delete
   * @param			Boolean allOrNone : If true, all records must save successfully or none will be saved
   * @return			SaveResultWrapper containing:
   *                  - success (Boolean): Overall operation success
   *                  - records (List<SObject>): Successfully saved records
   *                  - errors (SaveErrorsWrapper):
   *                      - insertErrors: Failed insert operations with record index, message, and fields
   *                      - updateErrors: Failed update operations with record ID, message, and fields
   *                      - deleteErrors: Failed delete operations with record ID and message
   **********************************************************************************************************/
  public static OD_Datatable.SaveResultWrapper saveRecords(
    String objectName,
    String fields,
    String recordsToCreate,
    String recordsToUpdate,
    String recordsToDelete,
    Boolean allOrNone
  ) {
    try {
      OD_Datatable.SaveResultWrapper result = new OD_Datatable.SaveResultWrapper();
      List<SObject> successRecords = new List<SObject>();

      // type to deserialise
      String strType = 'List<' + objectName + '>';
      Type theType = Type.forName(strType);

      if (String.isBlank(objectName)) {
        String message = 'An Object Name is required to modify the records.';
        AuraHandledException e = new AuraHandledException(message);
        e.setMessage(message);
        throw e;
      }

      if (String.isBlank(recordsToCreate) && String.isBlank(recordsToUpdate) && String.isBlank(recordsToDelete)) {
        String message = 'A list of records to add, edit and/or delete are needed to do the save';
        AuraHandledException e = new AuraHandledException(message);
        e.setMessage(message);
        throw e;
      }

      // Create a savepoint at the start
      Savepoint sp = Database.setSavepoint();

      // create new records
      if (String.isNotBlank(recordsToCreate)) {
        // First deserialize to List<Object> and convert each item to Map
        List<Object> rawList = (List<Object>) JSON.deserializeUntyped(recordsToCreate);
        List<Map<String, Object>> recordMaps = new List<Map<String, Object>>();
        for (Object item : rawList) {
          recordMaps.add((Map<String, Object>) item);
        }

        List<SObject> listToCreate = new List<SObject>();

        // Get field describe map for the object to use for type conversion
        SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        Map<String, Schema.SObjectField> fieldMap = sObjectType.getDescribe().fields.getMap();

        // Convert to SObjects for DML
        for (Map<String, Object> recordMap : recordMaps) {
          SObject newRecord = (SObject) Type.forName(objectName).newInstance();
          for (String field : recordMap.keySet()) {
            if (!field.startsWith('_')) {
              // Skip _id and other special fields
              Object value = recordMap.get(field);

              // Convert the value to the appropriate type based on the field's metadata
              if (value != null && fieldMap.containsKey(field)) {
                Schema.DisplayType fieldType = fieldMap.get(field).getDescribe().getType();
                value = convertToFieldType(value, fieldType);
              }

              newRecord.put(field, value);
            }
          }
          listToCreate.add(newRecord);
        }

        List<Database.SaveResult> createResults = Database.insert(listToCreate, false); // Always false to get error details

        for (Integer i = 0; i < createResults.size(); i++) {
          Database.SaveResult sr = createResults[i];
          if (sr.isSuccess()) {
            successRecords.add(listToCreate[i]);
          } else {
            result.success = false;
            result.errors.insertErrors.add(
              new OD_Datatable.SaveErrorWrapper(
                (String) recordMaps[i].get('_id'), // Use the preserved _id
                sr.getErrors()[0].getMessage(),
                sr.getErrors()
              )
            );
          }
        }

        if (!successRecords.isEmpty()) {
          Formula.recalculateFormulas(successRecords);
        }
      }

      // update records
      if (String.isNotBlank(recordsToUpdate)) {
        List<SObject> listToUpdate = (List<SObject>) JSON.deserialize(recordsToUpdate, theType);
        List<Database.SaveResult> updateResults = Database.update(listToUpdate, false); // Always false to get error details

        for (Integer i = 0; i < updateResults.size(); i++) {
          Database.SaveResult sr = updateResults[i];
          if (sr.isSuccess()) {
            successRecords.add(listToUpdate[i]);
          } else {
            result.success = false;
            result.errors.updateErrors.add(
              new OD_Datatable.SaveErrorWrapper(listToUpdate[i].Id, sr.getErrors()[0].getMessage(), sr.getErrors())
            );
          }
        }

        if (!successRecords.isEmpty()) {
          Formula.recalculateFormulas(successRecords);
        }
      }

      // delete records
      if (String.isNotBlank(recordsToDelete)) {
        List<SObject> listToDelete = (List<SObject>) JSON.deserialize(recordsToDelete, theType);
        List<Database.DeleteResult> deleteResults = Database.delete(listToDelete, false); // Always false to get error details

        for (Integer i = 0; i < deleteResults.size(); i++) {
          Database.DeleteResult dr = deleteResults[i];
          if (!dr.isSuccess()) {
            result.success = false;
            result.errors.deleteErrors.add(
              new OD_Datatable.SaveErrorWrapper(listToDelete[i].Id, dr.getErrors()[0].getMessage(), dr.getErrors())
            );
          }
        }
      }

      // If allOrNone is true and we had any errors, rollback everything
      if (allOrNone && !result.success) {
        Database.rollback(sp);
        result.records = new List<SObject>();
        return result;
      }

      // Query and return successful records
      if (!successRecords.isEmpty()) {
        List<Id> listIdsToQuery = new List<Id>();
        for (SObject record : successRecords) {
          listIdsToQuery.add(record.Id);
        }
        result.records = getRecords(objectName, fields, 'Id', listIdsToQuery);
      }

      return result;
    } catch (AuraHandledException e) {
      throw e;
    } catch (DmlException e) {
      throw e;
    } catch (Exception exc) {
      String message =
        'ERROR while trying to save the records: ' +
        exc.getMessage() +
        ' / ' +
        exc.getStackTraceString();
      AuraHandledException e = new AuraHandledException(message);
      e.setMessage(message);
      throw e;
    }
  }

  /*********************************************************************************************************
   * @name			convertToFieldType
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			22 / 03 / 2025
   * @description		Convert a value to the appropriate type based on the field's metadata
   * @param			Object value : The value to convert
   * @param			Schema.DisplayType fieldType : The type of the field
   * @return			Object with the converted value
   **********************************************************************************************************/
  private static Object convertToFieldType(Object value, Schema.DisplayType fieldType) {
    // If the value is null, return null
    if (value == null || value == '') {
      return null;
    }

    try {
      // Handle conversion based on field type
      switch on fieldType {
        when INTEGER {
          // Convert String to Integer
          if (value instanceof String) {
            return Integer.valueOf(value);
          }
          // Convert Decimal to Integer
          else if (value instanceof Decimal) {
            return Integer.valueOf((Decimal) value);
          }
        }
        when DOUBLE, CURRENCY, PERCENT {
          // Convert String to Decimal
          if (value instanceof String) {
            return Decimal.valueOf((String) value);
          }
        }
        when BOOLEAN {
          // Convert String to Boolean
          if (value instanceof String) {
            String strValue = (String) value;
            return (strValue.equalsIgnoreCase('true') ||
            strValue.equalsIgnoreCase('1') ||
            strValue.equalsIgnoreCase('yes'));
          }
          // Convert Integer to Boolean
          else if (value instanceof Integer) {
            return ((Integer) value) == 1;
          }
          // Convert Decimal to Boolean
          else if (value instanceof Decimal) {
            return ((Decimal) value) == 1;
          }
        }
        when DATE {
          // Convert String to Date
          if (value instanceof String) {
            return Date.valueOf((String) value);
          }
        }
        when DATETIME {
          // Convert String to DateTime
          if (value instanceof String) {
            return DateTime.ValueofGmt(((String) value).replace('T', ' '));
          }
        }
        when TIME {
          // Convert String to Time
          if (value instanceof String) {
            // Time.valueOf() doesn't exist, so we need to parse it manually
            String timeStr = (String) value;
            List<String> parts = timeStr.split(':');
            if (parts.size() >= 2) {
              Integer hour = Integer.valueOf(parts[0]);
              Integer minute = Integer.valueOf(parts[1]);
              Integer second = parts.size() > 2 ? Integer.valueOf(parts[2].split('\\.')[0]) : 0;
              return Time.newInstance(hour, minute, second, 0);
            }
          }
        }
      }

      // If no conversion was needed or possible, return the original value
      return value;
    } catch (Exception e) {
      // If conversion fails, return the original value
      // This allows the database to handle any type conversion errors
      return value;
    }
  }

  /*********************************************************************************************************
   * @name			getRecordsRelatedList
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			25 / 01 / 2025
   * @description		Get the records to display in the table for related lists (lightning record page and community pages)
   * @param			String objectName : The Name of the object to retrieve
   * @param			String fieldApiName : The name of the field to filter the records
   * @param			Id recordId : The Id to filter the records (with the field name above)
   * @param			String fields : Comma separated field names to retrieve
   * @return			List of found records
   **********************************************************************************************************/
  public static List<SObject> getRecordsRelatedList(
    String objectName,
    String fieldApiName,
    Id recordId,
    String fields
  ) {
    try {
      // build the query
      String query = 'SELECT Id, UserRecordAccess.HasEditAccess, UserRecordAccess.HasDeleteAccess';

      // add fields if any
      if (String.isNotBlank(fields)) {
        query += ', ' + String.escapeSingleQuotes(fields);
      }

      query += ' FROM ' + objectName + ' WHERE ' + fieldApiName + ' = :recordId';

      SObjectAccessDecision securityDecision = Security.stripInaccessible(AccessType.READABLE, Database.query(query));

      return securityDecision.getRecords();
    } catch (Exception exc) {
      String message =
        'ERROR while trying to get the related list records: ' +
        exc.getMessage() +
        ' / ' +
        exc.getStackTraceString();
      AuraHandledException e = new AuraHandledException(message);
      e.setMessage(message);
      throw e;
    }
  }
}