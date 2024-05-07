/*************************************************************************************************************
 * @name			OD_ConfigurationEditorController
 * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
 * @created			02 / 05 / 2023
 * @description		Controller for the OnDuty Data table Configuration Editor
 * @TestClass		OD_ConfigurationEditorControllerTest
 *
 * Changes (version)
 * -----------------------------------------------------------------------------------------------------------
 * 				No.		Date			Author					Description
 * 				----	------------	--------------------	----------------------------------------------
 * @version		1.0		2023-05-02		Pablo Martinez			Creation of the class
 *
 **************************************************************************************************************/
public without sharing class OD_ConfigurationEditorController {
  /*********************************************************************************************************
   * @name			getObjects
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of available objects to use in the table
   * @return			List of the object wrapper to use in the UI
   **********************************************************************************************************/
  @AuraEnabled(cacheable=true)
  public static ConfigurationWrapper getConfiguration() {
    ConfigurationWrapper result = new ConfigurationWrapper();

    // objects
    List<EntityDefinition> listObjects = [
      SELECT Label, QualifiedApiName
      FROM EntityDefinition
      WHERE
        IsCustomizable = TRUE
        AND IsCustomSetting = FALSE
        AND IsQueryable = TRUE
        AND IsEverUpdatable = TRUE
        AND IsEverCreatable = TRUE
        AND IsEverDeletable = TRUE
      ORDER BY Label
    ];

    for (EntityDefinition entity : listObjects) {
      result.objects.add(new RecordWrapper(entity.QualifiedApiName, entity.Label));
    }

    // flows
    List<FlowDefinitionView> listFlows = [
      SELECT Label, ApiName, ProcessType
      FROM FlowDefinitionView
      WHERE IsActive = TRUE AND ProcessType IN ('AutoLaunchedFlow', 'Flow') AND RecordTriggerType = NULL
      ORDER BY Label
    ];

    if (listFlows?.size() > 0) {
      for (FlowDefinitionView flow : listFlows) {
        result.flows.add(new RecordWrapper(flow.ApiName, flow.Label, flow.ProcessType));
      }
    }

    return result;
  }

  /*********************************************************************************************************
   * @name			getFieldsForObject
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of available fields for the object to use in the table
   * @param			String objectName : The name of the object to get the fields for
   * @return			List of the field wrapper to use in the UI
   **********************************************************************************************************/
  @AuraEnabled(cacheable=true)
  public static List<FieldWrapper> getFieldsForObject(String objectName) {
    List<FieldWrapper> result = new List<FieldWrapper>();

    try {
      // get the object give the string with the object name
      SObject objectInstance = (SObject) Type.forName('Schema', objectName).newInstance();

      // get the master detail fields for the object
      Set<String> masterDetailFields = new Set<String>();
      for (PicklistOption masterDetail : getMasterDetailFieldsForObject(objectName)) {
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
        FieldWrapper newField = new FieldWrapper();
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
              newField.options.add(new PicklistOption(plEntry.getValue(), plEntry.getLabel()));
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
   * @name			getMasterDetailFieldsForObject
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			08 / 05 / 2023
   * @description		Get a list of available master-detail fields for the object to use in the table
   * @param			String objectName : The name of the object to get the fields for
   * @return			List of the picklist options to use in the UI
   **********************************************************************************************************/
  @AuraEnabled(cacheable=true)
  public static List<PicklistOption> getMasterDetailFieldsForObject(String objectName) {
    List<PicklistOption> result = new List<PicklistOption>();

    // this is a list of objects where the Master Details fields don't return the getRelationshipOrder() different than null (Salesforce being Salesforce and breaking that rule)
    Set<String> standardObjectsMasterDetails = new Set<String>{ 'OpportunityLineItem', 'WorkOrderLineItem ' };

    try {
      // get the object give the string with the object name
      SObject objectInstance = (SObject) Type.forName('Schema', objectName).newInstance();

      // get the fields map for the object
      Map<String, Schema.SObjectField> fieldsMap = objectInstance.getSObjectType().getDescribe().fields.getMap();

      // for each field
      for (String fieldName : fieldsMap.keySet()) {
        Schema.DescribeFieldResult fieldResult = fieldsMap.get(fieldName).getDescribe();

        if (fieldResult.getReferenceTo().size() == 1 && !fieldResult.isDefaultedOnCreate()) {
          // check if it's a master detail by get relationship order
          if (fieldResult.getRelationshipOrder() != null || standardObjectsMasterDetails.contains(objectName)) {
            // add to the list
            result.add(new PicklistOption(fieldResult.getName(), fieldResult.getLabel()));
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
  @AuraEnabled
  public static List<PicklistOption> getRecordsForLookup(
    String objectName,
    String searchText,
    String searchGroup,
    String displayField,
    String whereCondition,
    String orderCondition,
    Integer limitRecords
  ) {
    try {
      List<PicklistOption> result = new List<PicklistOption>();

      String searchGroupToUse = String.isBlank(searchGroup) ? 'ALL FIELDS' : searchGroup;
      String nameField = String.isBlank(displayField) ? getNameFieldForObject(objectName) : displayField;
      String whereFilter = String.isBlank(whereCondition) ? '' : ' WHERE ' + whereCondition;
      String orderBy = String.isBlank(orderCondition) ? '' : ' ORDER BY ' + orderCondition;
      String limitToUse = limitRecords == null ? '' : ' LIMIT ' + limitRecords;
      String textToSearch = '*' + searchText.replace(' ', '*') + '*';

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
            result.add(new PicklistOption((String) record.get('Id'), (String) record.get(nameField)));
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
  @AuraEnabled
  public static PicklistOption getLookupRecord(String objectName, String value, String displayField) {
    try {
      // get the name field to return
      String nameField = String.isBlank(displayField) ? getNameFieldForObject(objectName) : displayField;

      // perform the query
      String searchQuery = 'SELECT Id, ' + nameField + ' FROM ' + objectName + ' WHERE Id = \'' + value + '\' LIMIT 1';

      List<SObject> searchList = Database.query(searchQuery);

      if (searchList?.size() > 0) {
        return new PicklistOption(value, (String) searchList[0].get(nameField));
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
   * @param			Set<Id> idsToQuery : Set of record ids to retrieve
   * @return			List of found records
   **********************************************************************************************************/
  @AuraEnabled
  public static List<SObject> getRecords(
    String objectName,
    String fields,
    String fieldNameFilter,
    List<Id> idsToQuery
  ) {
    // build the query
    String query = 'SELECT Id';

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
   * @description		Save the records (add, edit and delete)
   * @param			String objectName : The Name of the object to modify
   * @param			String fields : Comma separated field names to retrieve after insert/update
   * @param			String recordsToCreate : JSON string of the list of records to create
   * @param			String recordsToUpdate : JSON string of the list of records to update
   * @param			String recordsToDelete : JSON string of the list of records to delete
   * @return			List<SObject> with the new and updated SObject records
   **********************************************************************************************************/
  @AuraEnabled
  public static List<SObject> saveRecords(
    String objectName,
    String fields,
    String recordsToCreate,
    String recordsToUpdate,
    String recordsToDelete
  ) {
    try {
      List<SObject> result = new List<SObject>();

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

      // create new records
      if (String.isNotBlank(recordsToCreate)) {
        List<SObject> listToCreate = (List<SObject>) JSON.deserialize(recordsToCreate, theType);

        insert listToCreate;

        Formula.recalculateFormulas(listToCreate);

        result.addAll(listToCreate);
      }

      // update records
      if (String.isNotBlank(recordsToUpdate)) {
        List<SObject> listToUpdate = (List<SObject>) JSON.deserialize(recordsToUpdate, theType);

        update listToUpdate;

        Formula.recalculateFormulas(listToUpdate);

        result.addAll(listToUpdate);
      }

      // delete records
      if (String.isNotBlank(recordsToDelete)) {
        List<SObject> listToDelete = (List<SObject>) JSON.deserialize(recordsToDelete, theType);

        delete listToDelete;
      }

      List<Id> listIdsToQuery = new List<Id>();
      for (SObject record : result) {
        listIdsToQuery.add(record.Id);
      }

      return getRecords(objectName, fields, 'Id', listIdsToQuery);
    } catch (AuraHandledException e) {
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

  public class ConfigurationWrapper {
    @AuraEnabled
    public List<RecordWrapper> objects;

    @AuraEnabled
    public List<RecordWrapper> flows;

    public ConfigurationWrapper() {
      this.objects = new List<RecordWrapper>();
      this.flows = new List<RecordWrapper>();
    }
  }

  public class RecordWrapper {
    @AuraEnabled
    public String label;

    @AuraEnabled
    public String value;

    @AuraEnabled
    public String type;

    public RecordWrapper(String value, String label) {
      this.label = label;
      this.value = value;
      this.type = null;
    }

    public RecordWrapper(String value, String label, String type) {
      this.label = label;
      this.value = value;
      this.type = type;
    }
  }

  public class FieldWrapper implements Comparable {
    @AuraEnabled
    public String value;

    @AuraEnabled
    public String label;

    @AuraEnabled
    public String type;

    @AuraEnabled
    public Boolean canEdit;

    @AuraEnabled
    public Boolean required;

    @AuraEnabled
    public Integer maxLength;

    @AuraEnabled
    public Integer precision;

    @AuraEnabled
    public Integer scale;

    @AuraEnabled
    public Integer digits;

    @AuraEnabled
    public Boolean isHTML;

    @AuraEnabled
    public Object defaultValue;

    @AuraEnabled
    public String parentObjectName;

    @AuraEnabled
    public String parentObjectLabel;

    @AuraEnabled
    public Boolean canBeUsedInWhere;

    @AuraEnabled
    public Boolean isMasterDetail;

    @AuraEnabled
    public List<PicklistOption> options;

    public FieldWrapper() {
      this.options = new List<PicklistOption>();
    }

    public Integer compareTo(Object compareTo) {
      FieldWrapper curField = (FieldWrapper) compareTo;

      if (label == curField.label) {
        return 0;
      }
      if (label > curField.label) {
        return 1;
      }
      return -1;
    }
  }

  public class PicklistOption {
    @AuraEnabled
    public String value;

    @AuraEnabled
    public String label;

    public PicklistOption(String value, String label) {
      this.value = value;
      this.label = label;
    }
  }
}