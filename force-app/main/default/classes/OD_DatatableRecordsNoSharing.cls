/*************************************************************************************************************
 * @name			OD_DatatableRecordsNoSharing
 * @author			Pablo Martinez <pablo@farmcove.co.uk>
 * @created			26 / 01 / 2025
 * @description		Class to run the methods without the sharing enforced
 * @TestClass		OD_DatatableRecordsControllerTest
 *
 * Changes (version)
 * -----------------------------------------------------------------------------------------------------------
 * 				No.		Date			Author					Description
 * 				----	------------	--------------------	----------------------------------------------
 * @version		1.0		2025-01-26		Pablo Martinez			Creation of the class
 *
 **************************************************************************************************************/
public without sharing class OD_DatatableRecordsNoSharing {
  /*********************************************************************************************************
   * @name			getFieldsForObject
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of available fields for the object to use in the table
   * @param			String objectName : The name of the object to get the fields for
   * @return			List of the field wrapper to use in the UI
   **********************************************************************************************************/
  public static List<OD_Datatable.FieldWrapper> getFieldsForObject(String objectName) {
    return OD_DatatableService.getFieldsForObject(objectName);
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
    return OD_DatatableService.getRecordsForLookup(
      objectName,
      searchText,
      searchGroup,
      displayField,
      whereCondition,
      orderCondition,
      limitRecords
    );
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
    return OD_DatatableService.getLookupRecord(objectName, value, displayField);
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
    return OD_DatatableService.getRecords(objectName, fields, fieldNameFilter, idsToQuery);
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
  public static List<SObject> saveRecords(
    String objectName,
    String fields,
    String recordsToCreate,
    String recordsToUpdate,
    String recordsToDelete
  ) {
    return OD_DatatableService.saveRecords(objectName, fields, recordsToCreate, recordsToUpdate, recordsToDelete);
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
    return OD_DatatableService.getRecordsRelatedList(objectName, fieldApiName, recordId, fields);
  }
}