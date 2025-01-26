/*************************************************************************************************************
 * @name			OD_DatatableRecordsController
 * @author			Pablo Martinez <pablo@farmcove.co.uk>
 * @created			26 / 01 / 2025
 * @description		Class to run the methods that manages records in the component
 * @TestClass		OD_DatatableRecordsControllerTest
 *
 * Changes (version)
 * -----------------------------------------------------------------------------------------------------------
 * 				No.		Date			Author					Description
 * 				----	------------	--------------------	----------------------------------------------
 * @version		1.0		2025-01-26		Pablo Martinez			Creation of the class
 *
 **************************************************************************************************************/
public without sharing class OD_DatatableRecordsController {
  /*********************************************************************************************************
   * @name			getFieldsForObject
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of available fields for the object to use in the table
   * @param			Boolean withSharing : Executes the method with sharing context or not
   * @param			String objectName : The name of the object to get the fields for
   * @return			List of the field wrapper to use in the UI
   **********************************************************************************************************/
  @AuraEnabled(cacheable=true)
  public static List<OD_Datatable.FieldWrapper> getFieldsForObject(Boolean withSharing, String objectName) {
    if (withSharing) {
      return OD_DatatableRecordsSharing.getFieldsForObject(objectName);
    } else {
      return OD_DatatableRecordsNoSharing.getFieldsForObject(objectName);
    }
  }

  /*********************************************************************************************************
   * @name			getRecordsForLookup
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of picklist options from a record and return it to the UI
   * @param			Boolean withSharing : Executes the method with sharing context or not
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
  public static List<OD_Datatable.PicklistOption> getRecordsForLookup(
    Boolean withSharing,
    String objectName,
    String searchText,
    String searchGroup,
    String displayField,
    String whereCondition,
    String orderCondition,
    Integer limitRecords
  ) {
    if (withSharing) {
      return OD_DatatableRecordsSharing.getRecordsForLookup(
        objectName,
        searchText,
        searchGroup,
        displayField,
        whereCondition,
        orderCondition,
        limitRecords
      );
    } else {
      return OD_DatatableRecordsNoSharing.getRecordsForLookup(
        objectName,
        searchText,
        searchGroup,
        displayField,
        whereCondition,
        orderCondition,
        limitRecords
      );
    }
  }

  /*********************************************************************************************************
   * @name			getLookupRecord
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a picklist option for a record
   * @param			Boolean withSharing : Executes the method with sharing context or not
   * @param			String objectName : The name of the object to get the record for
   * @param			String value : The Id of the record to look for
   * @param			String displayField : The Display field to return, if null the Name field for the object will be used
   * @return			Picklist option
   **********************************************************************************************************/
  @AuraEnabled
  public static OD_Datatable.PicklistOption getLookupRecord(
    Boolean withSharing,
    String objectName,
    String value,
    String displayField
  ) {
    if (withSharing) {
      return OD_DatatableRecordsSharing.getLookupRecord(objectName, value, displayField);
    } else {
      return OD_DatatableRecordsNoSharing.getLookupRecord(objectName, value, displayField);
    }
  }

  /*********************************************************************************************************
   * @name			getRecords
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			03 / 08 / 2023
   * @description		Get the records after insert/update to return updated fields to the UI
   * @param			Boolean withSharing : Executes the method with sharing context or not
   * @param			String objectName : The Name of the object to retrieve
   * @param			String fields : Comma separated field names to retrieve
   * @param			String fieldNameFilter : The field Name to use in the filter
   * @param			Set<Id> idsToQuery : Set of record ids to retrieve
   * @return			List of found records
   **********************************************************************************************************/
  @AuraEnabled
  public static List<SObject> getRecords(
    Boolean withSharing,
    String objectName,
    String fields,
    String fieldNameFilter,
    List<Id> idsToQuery
  ) {
    if (withSharing) {
      return OD_DatatableRecordsSharing.getRecords(objectName, fields, fieldNameFilter, idsToQuery);
    } else {
      return OD_DatatableRecordsNoSharing.getRecords(objectName, fields, fieldNameFilter, idsToQuery);
    }
  }

  /*********************************************************************************************************
   * @name			saveRecords
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			27 / 07 / 2023
   * @description		Save the records (add, edit and delete)
   * @param			Boolean withSharing : Executes the method with sharing context or not
   * @param			String objectName : The Name of the object to modify
   * @param			String fields : Comma separated field names to retrieve after insert/update
   * @param			String recordsToCreate : JSON string of the list of records to create
   * @param			String recordsToUpdate : JSON string of the list of records to update
   * @param			String recordsToDelete : JSON string of the list of records to delete
   * @return			List<SObject> with the new and updated SObject records
   **********************************************************************************************************/
  @AuraEnabled
  public static List<SObject> saveRecords(
    Boolean withSharing,
    String objectName,
    String fields,
    String recordsToCreate,
    String recordsToUpdate,
    String recordsToDelete
  ) {
    if (withSharing) {
      return OD_DatatableRecordsSharing.saveRecords(
        objectName,
        fields,
        recordsToCreate,
        recordsToUpdate,
        recordsToDelete
      );
    } else {
      return OD_DatatableRecordsNoSharing.saveRecords(
        objectName,
        fields,
        recordsToCreate,
        recordsToUpdate,
        recordsToDelete
      );
    }
  }

  /*********************************************************************************************************
   * @name			getRecordsRelatedList
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			25 / 01 / 2025
   * @description		Get the records to display in the table for related lists (lightning record page and community pages)
   * @param			Boolean withSharing : Executes the method with sharing context or not
   * @param			String objectName : The Name of the object to retrieve
   * @param			String fieldApiName : The name of the field to filter the records
   * @param			Id recordId : The Id to filter the records (with the field name above)
   * @param			String fields : Comma separated field names to retrieve
   * @return			List of found records
   **********************************************************************************************************/
  @AuraEnabled(cacheable=true)
  public static List<SObject> getRecordsRelatedList(
    Boolean withSharing,
    String objectName,
    String fieldApiName,
    Id recordId,
    String fields
  ) {
    if (withSharing) {
      return OD_DatatableRecordsSharing.getRecordsRelatedList(objectName, fieldApiName, recordId, fields);
    } else {
      return OD_DatatableRecordsNoSharing.getRecordsRelatedList(objectName, fieldApiName, recordId, fields);
    }
  }
}