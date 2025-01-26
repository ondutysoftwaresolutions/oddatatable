/*************************************************************************************************************
 * @name			OD_DatatableConfigurationController
 * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
 * @created			02 / 05 / 2023
 * @description		Controller for the OnDuty Data table Configuration Editor
 * @TestClass		OD_DatatableConfigurationControllerTest
 *
 * Changes (version)
 * -----------------------------------------------------------------------------------------------------------
 * 				No.		Date			Author					Description
 * 				----	------------	--------------------	----------------------------------------------
 * @version		1.0		2023-05-02		Pablo Martinez			Creation of the class
 *
 **************************************************************************************************************/
public without sharing class OD_DatatableConfigurationController {
  /*********************************************************************************************************
   * @name			getObjects
   * @author			Pablo Martinez <ondutysoftwaresolutions@gmail.com>
   * @created			02 / 05 / 2023
   * @description		Get a list of available objects to use in the table
   * @return			List of the object wrapper to use in the UI
   **********************************************************************************************************/
  @AuraEnabled(cacheable=true)
  public static OD_Datatable.ConfigurationWrapper getConfiguration() {
    OD_Datatable.ConfigurationWrapper result = new OD_Datatable.ConfigurationWrapper();

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
      result.objects.add(new OD_Datatable.RecordWrapper(entity.QualifiedApiName, entity.Label));
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
        result.flows.add(new OD_Datatable.RecordWrapper(flow.ApiName, flow.Label, flow.ProcessType));
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
  public static List<OD_Datatable.FieldWrapper> getFieldsForObject(String objectName) {
    return OD_DatatableService.getFieldsForObject(objectName);
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
  public static List<OD_Datatable.PicklistOption> getMasterDetailFieldsForObject(String objectName) {
    return OD_DatatableService.getMasterDetailFieldsForObject(objectName);
  }

  /*********************************************************************************************************
   * @name			getConfigurationRelatedList
   * @author			Pablo Martinez <pablo@farmcove.co.uk>
   * @created			25 / 01 / 2025
   * @description		Get the Table configuration to use in the component for lightning pages and community pages
   * @param			String customMetadataName : The DeveloperName of the custom metadata record that contains the table configuration
   * @return			String with the serialised JSON of the table configuration
   **********************************************************************************************************/
  @AuraEnabled(cacheable=true)
  public static String getConfigurationRelatedList(String customMetadataName) {
    try {
      // get the custom metadata
      List<OD_Datatable_JSON_Configuration__mdt> customMetadatas = [
        SELECT Table_Configuration__c
        FROM OD_Datatable_JSON_Configuration__mdt
        WHERE DeveloperName = :customMetadataName
        LIMIT 1
      ];

      if (customMetadatas != null && customMetadatas.size() == 1) {
        return customMetadatas[0].Table_Configuration__c;
      } else {
        String message =
          'There is no custom metadata record in the OD_Datatable_JSON_Configuration__mdt with the name ' +
          customMetadataName +
          '. Please add the record or change the name in the component.';
        AuraHandledException e = new AuraHandledException(message);
        e.setMessage(message);
        throw e;
      }
    } catch (AuraHandledException e) {
      throw e;
    } catch (Exception exc) {
      String message =
        'ERROR while trying to get the related list configuration the records: ' +
        exc.getMessage() +
        ' / ' +
        exc.getStackTraceString();
      AuraHandledException e = new AuraHandledException(message);
      e.setMessage(message);
      throw e;
    }
  }
}