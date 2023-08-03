@IsTest
public class OD_ConfigurationEditorControllerTest {
  @TestSetup
  static void setup() {
    Account acc = new Account(Name = 'Test');
    insert acc;

    Contact con = new Contact(FirstName = 'First', LastName = 'Test', AccountId = acc.Id);
    insert con;

    Contact con2 = new Contact(FirstName = 'Second', LastName = 'LastName', AccountId = acc.Id);
    insert con2;

    Contact con3 = new Contact(FirstName = 'Third', LastName = 'Test 2', AccountId = acc.Id);
    insert con3;

    Case theCase = new Case();
    insert theCase;
  }

  @IsTest
  static void testGetConfigurationSuccess() {
    Test.startTest();

    OD_ConfigurationEditorController.ConfigurationWrapper result = OD_ConfigurationEditorController.getConfiguration();

    Test.stopTest();

    Assert.isTrue(result.objects.size() > 0, 'We couldn\'t find any object');
    Assert.isTrue(result.flows.size() > 0, 'We couldn\'t find any screen flow');
  }

  @IsTest
  static void testGetFieldsForObjectSuccess() {
    Test.startTest();

    List<OD_ConfigurationEditorController.FieldWrapper> result = OD_ConfigurationEditorController.getFieldsForObject(
      'Account'
    );

    Test.stopTest();

    Assert.isTrue(result.size() > 0, 'We couldn\'t find any field for the Account object');
  }

  @IsTest
  static void testGetFieldsForObjectFail() {
    Test.startTest();

    try {
      List<OD_ConfigurationEditorController.FieldWrapper> result = OD_ConfigurationEditorController.getFieldsForObject(
        null
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the fields for the Object: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetRecordsForLookupSuccess() {
    Contact con = [SELECT Id, Name FROM Contact WHERE LastName = 'Test' LIMIT 1];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con.Id };
    Test.setFixedSearchResults(fixedSearchResults);

    List<OD_ConfigurationEditorController.PicklistOption> result = OD_ConfigurationEditorController.getRecordsForLookup(
      'Contact',
      'test',
      null,
      null,
      null,
      null,
      null
    );

    Test.stopTest();

    Assert.isTrue(result.size() > 0, 'We couldn\'t find any lookup record');
    Assert.areEqual(result[0].label, con.Name, 'Wrong label found');
  }

  @IsTest
  static void testGetRecordsForLookupSuccessAllParams() {
    List<Contact> con = [SELECT Id, LastName, AccountId FROM Contact WHERE LastName LIKE 'Test%'];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con[0].Id, con[1].Id };
    Test.setFixedSearchResults(fixedSearchResults);

    List<OD_ConfigurationEditorController.PicklistOption> result = OD_ConfigurationEditorController.getRecordsForLookup(
      'Contact',
      'test',
      'NAME FIELDS',
      'FirstName',
      'AccountId = \'' +
      con[0].AccountId +
      '\'',
      'LastName ASC',
      2
    );

    Test.stopTest();

    Assert.isTrue(result.size() == 2, 'The return did not respect the limit');
    Assert.areEqual(result[0].label, 'First', 'Wrong label found for the first record');
    Assert.areEqual(result[1].label, 'Third', 'Wrong label found for the second record');
  }

  @IsTest
  static void testGetRecordsForLookupFail() {
    Contact con = [SELECT Id FROM Contact WHERE LastName = 'Test' LIMIT 1];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con.Id };
    Test.setFixedSearchResults(fixedSearchResults);

    try {
      List<OD_ConfigurationEditorController.PicklistOption> result = OD_ConfigurationEditorController.getRecordsForLookup(
        null,
        't',
        null,
        null,
        null,
        null,
        null
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the records for the Object: null and the text: t.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetLookupRecordSuccess() {
    Contact con = [SELECT Id, Name FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    OD_ConfigurationEditorController.PicklistOption result = OD_ConfigurationEditorController.getLookupRecord(
      'Contact',
      con.Id,
      null
    );

    Test.stopTest();

    Assert.areEqual(result.label, con.Name, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordSuccessOtherDisplayValue() {
    Contact con = [SELECT Id, FirstName, LastName FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    OD_ConfigurationEditorController.PicklistOption result = OD_ConfigurationEditorController.getLookupRecord(
      'Contact',
      con.Id,
      'FirstName'
    );

    Test.stopTest();

    Assert.areEqual(result.label, con.FirstName, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordCaseSuccess() {
    Case theCase = [SELECT Id, CaseNumber FROM Case LIMIT 1];
    Test.startTest();

    OD_ConfigurationEditorController.PicklistOption result = OD_ConfigurationEditorController.getLookupRecord(
      'Case',
      theCase.Id,
      null
    );

    Test.stopTest();

    Assert.areEqual(result.label, theCase.CaseNumber, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordFail() {
    Contact con = [SELECT Id FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    try {
      OD_ConfigurationEditorController.PicklistOption result = OD_ConfigurationEditorController.getLookupRecord(
        'Contact',
        null,
        null
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the record for the Object: Contact and the Id: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetMasterDetailFieldsForObjectSuccessFound() {
    Test.startTest();

    List<OD_ConfigurationEditorController.PicklistOption> result = OD_ConfigurationEditorController.getMasterDetailFieldsForObject(
      'OpportunityLineItem'
    );

    Test.stopTest();

    Assert.isTrue(result.size() > 1, 'We couldn\'t find any field for the OpportunityLineItem object');
  }

  @IsTest
  static void testGetMasterDetailFieldsForObjectSuccessNotFound() {
    Test.startTest();

    List<OD_ConfigurationEditorController.PicklistOption> result = OD_ConfigurationEditorController.getMasterDetailFieldsForObject(
      'Account'
    );

    Test.stopTest();

    Assert.isTrue(result.size() == 0, 'We could find at least one field for the Account object');
  }

  @IsTest
  static void testGetMasterDetailFieldsForObjectFail() {
    Test.startTest();

    try {
      List<OD_ConfigurationEditorController.PicklistOption> result = OD_ConfigurationEditorController.getMasterDetailFieldsForObject(
        'OpportunityProduct'
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the master detail fields for the Object: OpportunityProduct'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testSaveRecordsSuccess() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Assert.isTrue(contacts.size() == 3, 'Wrong number of contacts before the process');

    Test.startTest();

    List<SObject> result = OD_ConfigurationEditorController.saveRecords(
      'Contact',
      'FirstName,LastName',
      '[{"LastName": "Created 1"},{"LastName": "Created 2"}]',
      '[{ "Id": "' +
      contacts[0].Id +
      '", "LastName": "LastName Updated"}]',
      '[{ "Id": "' +
      contacts[1].Id +
      '"}]'
    );

    Test.stopTest();

    contacts = [SELECT Id, LastName FROM Contact ORDER BY LastName];

    Assert.isTrue(result.size() == 3, 'Wrong number of returned records');
    Assert.isTrue(contacts.size() == 4, 'Wrong number of contacts after the process');
    Assert.areEqual(contacts[0].LastName, 'Created 1', 'Wrong last name on the first contact');
    Assert.areEqual(contacts[1].LastName, 'Created 2', 'Wrong last name on the second contact');
    Assert.areEqual(contacts[2].LastName, 'LastName Updated', 'Wrong last name on the third contact');
  }

  @IsTest
  static void testSaveRecordsFailNoObjectName() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Test.startTest();

    try {
      List<SObject> result = OD_ConfigurationEditorController.saveRecords(
        null,
        'FirstName,LastName',
        '[{"LastName": "Created 1"},{"LastName": "Created 2"}]',
        '[{ "Id": "' +
        contacts[0].Id +
        '", "LastName": "LastName Updated"}]',
        '[{ "Id": "' +
        contacts[1].Id +
        '"}]'
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('An Object Name is required to modify the records.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testSaveRecordsFailNoLists() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Test.startTest();

    try {
      List<SObject> result = OD_ConfigurationEditorController.saveRecords('Contact', null, null, null, null);
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('A list of records to add, edit and/or delete are needed to do the save'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }
}