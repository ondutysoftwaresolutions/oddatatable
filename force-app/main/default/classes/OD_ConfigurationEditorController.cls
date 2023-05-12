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
public with sharing class OD_ConfigurationEditorController {
  /*********************************************************************************************************
   * @name			getObjects
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of available objects to use in the table
   * @return			List of the object wrapper to use in the UI
   **********************************************************************************************************/
  @AuraEnabled(cacheable=true)
  public static List<ObjectWrapper> getObjects() {
    List<ObjectWrapper> result = new List<ObjectWrapper>();
    Map<String, SObjectType> allObjects = Schema.getGlobalDescribe();

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
      result.add(new ObjectWrapper(entity.QualifiedApiName, entity.Label));
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

      // get the fields map for the object
      Map<String, Schema.SObjectField> fieldsMap = objectInstance.getSObjectType().getDescribe().fields.getMap();

      // for each field
      for (String fieldName : fieldsMap.keySet()) {
        Schema.DescribeFieldResult fieldResult = fieldsMap.get(fieldName).getDescribe();

        Boolean canEdit =
          !fieldResult.isCalculated() &&
          (fieldResult.isPermissionable() || fieldResult.isNameField()) &&
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

    try {
      // get the object give the string with the object name
      SObject objectInstance = (SObject) Type.forName('Schema', objectName).newInstance();

      // get the fields map for the object
      Map<String, Schema.SObjectField> fieldsMap = objectInstance.getSObjectType().getDescribe().fields.getMap();

      // for each field
      for (String fieldName : fieldsMap.keySet()) {
        Schema.DescribeFieldResult fieldResult = fieldsMap.get(fieldName).getDescribe();

        if (fieldResult.getReferenceTo().size() == 1 && !fieldResult.isDefaultedOnCreate()) {
          // check if it's a master detail by get relationship order or if it does not have an ownerId field
          if (fieldResult.getRelationshipOrder() != null || !fieldsMap.containsKey('OwnerId')) {
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
   * @return			List of picklist options
   **********************************************************************************************************/
  @AuraEnabled
  public static List<PicklistOption> getRecordsForLookup(String objectName, String searchText) {
    try {
      List<PicklistOption> result = new List<PicklistOption>();

      String nameField = getNameFieldForObject(objectName);

      // perform the query
      String searchQuery =
        'FIND {' +
        searchText +
        '} IN NAME FIELDS RETURNING ' +
        objectName +
        '(Id, ' +
        nameField +
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
   * @return			Picklist option
   **********************************************************************************************************/
  @AuraEnabled
  public static PicklistOption getLookupRecord(String objectName, String value) {
    try {
      // get the name field to return
      String nameField = getNameFieldForObject(objectName);

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

  public class ObjectWrapper {
    @AuraEnabled
    public String label;

    @AuraEnabled
    public String value;

    public ObjectWrapper(String value, String label) {
      this.label = label;
      this.value = value;
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