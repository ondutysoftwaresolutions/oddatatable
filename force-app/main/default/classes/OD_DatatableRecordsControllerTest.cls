@IsTest
public class OD_DatatableRecordsControllerTest {
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

  // =================================================================
  // SHARING
  // =================================================================
  @IsTest
  static void testGetRecordsForLookupSuccessSharing() {
    Contact con = [SELECT Id, Name FROM Contact WHERE LastName = 'Test' LIMIT 1];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con.Id };
    Test.setFixedSearchResults(fixedSearchResults);

    List<OD_Datatable.PicklistOption> result = OD_DatatableRecordsController.getRecordsForLookup(
      true,
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
  static void testGetRecordsForLookupSuccessAllParamsSharing() {
    List<Contact> con = [SELECT Id, LastName, AccountId FROM Contact WHERE LastName LIKE 'Test%'];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con[0].Id, con[1].Id };
    Test.setFixedSearchResults(fixedSearchResults);

    List<OD_Datatable.PicklistOption> result = OD_DatatableRecordsController.getRecordsForLookup(
      true,
      'Contact',
      'test',
      'NAME FIELDS',
      'FirstName',
      'AccountId = \'' + con[0].AccountId + '\'',
      'LastName ASC',
      2
    );

    Test.stopTest();

    Assert.isTrue(result.size() == 2, 'The return did not respect the limit');
    Assert.areEqual(result[0].label, 'First', 'Wrong label found for the first record');
    Assert.areEqual(result[1].label, 'Third', 'Wrong label found for the second record');
  }

  @IsTest
  static void testGetRecordsForLookupFailSharing() {
    Contact con = [SELECT Id FROM Contact WHERE LastName = 'Test' LIMIT 1];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con.Id };
    Test.setFixedSearchResults(fixedSearchResults);

    try {
      List<OD_Datatable.PicklistOption> result = OD_DatatableRecordsController.getRecordsForLookup(
        true,
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
  static void testGetLookupRecordSuccessSharing() {
    Contact con = [SELECT Id, Name FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    OD_Datatable.PicklistOption result = OD_DatatableRecordsController.getLookupRecord(true, 'Contact', con.Id, null);

    Test.stopTest();

    Assert.areEqual(result.label, con.Name, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordSuccessOtherDisplayValueSharing() {
    Contact con = [SELECT Id, FirstName, LastName FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    OD_Datatable.PicklistOption result = OD_DatatableRecordsController.getLookupRecord(
      true,
      'Contact',
      con.Id,
      'FirstName'
    );

    Test.stopTest();

    Assert.areEqual(result.label, con.FirstName, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordCaseSuccessSharing() {
    Case theCase = [SELECT Id, CaseNumber FROM Case LIMIT 1];
    Test.startTest();

    OD_Datatable.PicklistOption result = OD_DatatableRecordsController.getLookupRecord(true, 'Case', theCase.Id, null);

    Test.stopTest();

    Assert.areEqual(result.label, theCase.CaseNumber, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordFailSharing() {
    Contact con = [SELECT Id FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    try {
      OD_Datatable.PicklistOption result = OD_DatatableRecordsController.getLookupRecord(true, 'Contact', null, null);
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the record for the Object: Contact and the Id: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testSaveRecordsSuccessSharing() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Assert.isTrue(contacts.size() == 3, 'Wrong number of contacts before the process');

    Test.startTest();

    OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
      true,
      'Contact',
      'FirstName,LastName',
      '[{"LastName": "Created 1"},{"LastName": "Created 2"}]',
      '[{ "Id": "' + contacts[0].Id + '", "LastName": "LastName Updated"}]',
      '[{ "Id": "' + contacts[1].Id + '"}]',
      false
    );

    Test.stopTest();

    contacts = [SELECT Id, LastName FROM Contact ORDER BY LastName];

    Assert.isTrue(result.records.size() == 3, 'Wrong number of returned records');
    Assert.isTrue(contacts.size() == 4, 'Wrong number of contacts after the process');
    Assert.areEqual(contacts[0].LastName, 'Created 1', 'Wrong last name on the first contact');
    Assert.areEqual(contacts[1].LastName, 'Created 2', 'Wrong last name on the second contact');
    Assert.areEqual(contacts[2].LastName, 'LastName Updated', 'Wrong last name on the third contact');
  }

  @IsTest
  static void testSaveRecordsFailNoObjectNameSharing() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Test.startTest();

    try {
      OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
        true,
        null,
        'FirstName,LastName',
        '[{"LastName": "Created 1"},{"LastName": "Created 2"}]',
        '[{ "Id": "' + contacts[0].Id + '", "LastName": "LastName Updated"}]',
        '[{ "Id": "' + contacts[1].Id + '"}]',
        false
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
  static void testSaveRecordsFailNoListsSharing() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Test.startTest();

    try {
      OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
        true,
        'Contact',
        null,
        null,
        null,
        null,
        false
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('A list of records to add, edit and/or delete are needed to do the save'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testSaveRecordsWithDMLErrorsSharing() {
    Test.startTest();

    OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
      true,
      'Contact',
      'FirstName,LastName',
      '[{"FirstName": "Error1"}, {"FirstName": "Error2"}]',
      null,
      null,
      false
    );

    Test.stopTest();

    Assert.isFalse(result.success, 'The save operation should have failed');
    Assert.isTrue(result.errors.insertErrors.size() > 0, 'There should be insert errors');

    for (OD_Datatable.SaveErrorWrapper error : result.errors.insertErrors) {
      Assert.isTrue(error.message != null && error.message.length() > 0, 'Error message should not be empty');
      Assert.isTrue(error.fieldErrors.size() > 0, 'Field errors should be captured');

      Boolean hasLastNameField = false;
      for (OD_Datatable.FieldErrorWrapper fieldError : error.fieldErrors) {
        if (fieldError.fieldName == 'LastName') {
          hasLastNameField = true;
          break;
        }
      }
      Assert.isTrue(hasLastNameField, 'LastName field should be in the field errors');
    }
  }

  @IsTest
  static void testSaveRecordsWithGeneralErrorsSharing() {
    Test.startTest();

    OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
      true,
      'Contact',
      'FirstName,LastName',
      '[{"FirstName": "Error1"}, {"FirstName": "Error2"}]',
      null,
      null,
      false
    );

    Test.stopTest();

    Assert.isFalse(result.success, 'The save operation should have failed');
    Assert.isTrue(result.errors.insertErrors.size() > 0, 'There should be insert errors');

    for (OD_Datatable.SaveErrorWrapper error : result.errors.insertErrors) {
      Assert.isTrue(error.message != null && error.message.length() > 0, 'Error message should not be empty');
      Assert.isTrue(error.fieldErrors.size() > 0, 'Field errors should be captured');
    }
  }

  @IsTest
  static void testGetRecordsRelatedListSuccessSharing() {
    Account acc = [SELECT Id FROM Account LIMIT 1];

    Test.startTest();

    List<SObject> records = OD_DatatableRecordsController.getRecordsRelatedList(
      true,
      'Contact',
      'AccountId',
      acc.Id,
      'FirstName,LastName'
    );

    Test.stopTest();

    Assert.isTrue(records.size() == 3, 'There are not 3 contacts');
  }

  @IsTest
  static void testGetRecordsRelatedListFailSharing() {
    Account acc = [SELECT Id FROM Account LIMIT 1];

    Test.startTest();

    try {
      List<SObject> records = OD_DatatableRecordsController.getRecordsRelatedList(
        true,
        'Contact',
        'AccountId__c',
        acc.Id,
        'FirstName,LastName'
      );
    } catch (Exception e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while trying to get the related list records:'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetRecordsSuccessSharing() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Assert.isTrue(contacts.size() == 3, 'Wrong number of contacts before the process');

    Test.startTest();

    List<SObject> result = OD_DatatableRecordsController.getRecords(
      true,
      'Contact',
      'FirstName,LastName',
      'Id',
      new List<Id>{ contacts[0].Id, contacts[1].Id }
    );

    Test.stopTest();

    Assert.isTrue(result.size() == 2, 'Wrong number of returned records');
  }

  @IsTest
  static void testGetFieldsForObjectSuccessSharing() {
    Test.startTest();

    List<OD_Datatable.FieldWrapper> result = OD_DatatableRecordsController.getFieldsForObject(true, 'Account');

    Test.stopTest();

    Assert.isTrue(result.size() > 0, 'We couldn\'t find any field for the Account object');
  }

  @IsTest
  static void testGetFieldsForObjectFailSharing() {
    Test.startTest();

    try {
      List<OD_Datatable.FieldWrapper> result = OD_DatatableRecordsController.getFieldsForObject(true, null);
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the fields for the Object: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  // =================================================================
  // NO SHARING
  // =================================================================
  @IsTest
  static void testGetRecordsForLookupSuccessNoSharing() {
    Contact con = [SELECT Id, Name FROM Contact WHERE LastName = 'Test' LIMIT 1];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con.Id };
    Test.setFixedSearchResults(fixedSearchResults);

    List<OD_Datatable.PicklistOption> result = OD_DatatableRecordsController.getRecordsForLookup(
      false,
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
  static void testGetRecordsForLookupSuccessAllParamsNoSharing() {
    List<Contact> con = [SELECT Id, LastName, AccountId FROM Contact WHERE LastName LIKE 'Test%'];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con[0].Id, con[1].Id };
    Test.setFixedSearchResults(fixedSearchResults);

    List<OD_Datatable.PicklistOption> result = OD_DatatableRecordsController.getRecordsForLookup(
      false,
      'Contact',
      'test',
      'NAME FIELDS',
      'FirstName',
      'AccountId = \'' + con[0].AccountId + '\'',
      'LastName ASC',
      2
    );

    Test.stopTest();

    Assert.isTrue(result.size() == 2, 'The return did not respect the limit');
    Assert.areEqual(result[0].label, 'First', 'Wrong label found for the first record');
    Assert.areEqual(result[1].label, 'Third', 'Wrong label found for the second record');
  }

  @IsTest
  static void testGetRecordsForLookupFailNoSharing() {
    Contact con = [SELECT Id FROM Contact WHERE LastName = 'Test' LIMIT 1];
    Test.startTest();

    Id[] fixedSearchResults = new List<Id>{ con.Id };
    Test.setFixedSearchResults(fixedSearchResults);

    try {
      List<OD_Datatable.PicklistOption> result = OD_DatatableRecordsController.getRecordsForLookup(
        false,
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
  static void testGetLookupRecordSuccessNoSharing() {
    Contact con = [SELECT Id, Name FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    OD_Datatable.PicklistOption result = OD_DatatableRecordsController.getLookupRecord(false, 'Contact', con.Id, null);

    Test.stopTest();

    Assert.areEqual(result.label, con.Name, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordSuccessOtherDisplayValueNoSharing() {
    Contact con = [SELECT Id, FirstName, LastName FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    OD_Datatable.PicklistOption result = OD_DatatableRecordsController.getLookupRecord(
      false,
      'Contact',
      con.Id,
      'FirstName'
    );

    Test.stopTest();

    Assert.areEqual(result.label, con.FirstName, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordCaseSuccessNoSharing() {
    Case theCase = [SELECT Id, CaseNumber FROM Case LIMIT 1];
    Test.startTest();

    OD_Datatable.PicklistOption result = OD_DatatableRecordsController.getLookupRecord(false, 'Case', theCase.Id, null);

    Test.stopTest();

    Assert.areEqual(result.label, theCase.CaseNumber, 'Wrong label found');
  }

  @IsTest
  static void testGetLookupRecordFailNoSharing() {
    Contact con = [SELECT Id FROM Contact WHERE LastName = 'LastName' LIMIT 1];
    Test.startTest();

    try {
      OD_Datatable.PicklistOption result = OD_DatatableRecordsController.getLookupRecord(false, 'Contact', null, null);
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the record for the Object: Contact and the Id: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testSaveRecordsSuccessNoSharing() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Assert.isTrue(contacts.size() == 3, 'Wrong number of contacts before the process');

    Test.startTest();

    OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
      false,
      'Contact',
      'FirstName,LastName',
      '[{"LastName": "Created 1"},{"LastName": "Created 2"}]',
      '[{ "Id": "' + contacts[0].Id + '", "LastName": "LastName Updated"}]',
      '[{ "Id": "' + contacts[1].Id + '"}]',
      false
    );

    Test.stopTest();

    contacts = [SELECT Id, LastName FROM Contact ORDER BY LastName];

    Assert.isTrue(result.records.size() == 3, 'Wrong number of returned records');
    Assert.isTrue(contacts.size() == 4, 'Wrong number of contacts after the process');
    Assert.areEqual(contacts[0].LastName, 'Created 1', 'Wrong last name on the first contact');
    Assert.areEqual(contacts[1].LastName, 'Created 2', 'Wrong last name on the second contact');
    Assert.areEqual(contacts[2].LastName, 'LastName Updated', 'Wrong last name on the third contact');
  }

  @IsTest
  static void testSaveRecordsFailNoObjectNameNoSharing() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Test.startTest();

    try {
      OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
        false,
        null,
        'FirstName,LastName',
        '[{"LastName": "Created 1"},{"LastName": "Created 2"}]',
        '[{ "Id": "' + contacts[0].Id + '", "LastName": "LastName Updated"}]',
        '[{ "Id": "' + contacts[1].Id + '"}]',
        false
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
  static void testSaveRecordsFailNoListsNoSharing() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Test.startTest();

    try {
      OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
        false,
        'Contact',
        null,
        null,
        null,
        null,
        false
      );
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('A list of records to add, edit and/or delete are needed to do the save'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testSaveRecordsWithDMLErrorsNoSharing() {
    Test.startTest();

    OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
      false,
      'Contact',
      'FirstName,LastName',
      '[{"FirstName": "Error1"}, {"FirstName": "Error2"}]',
      null,
      null,
      false
    );

    Test.stopTest();

    Assert.isFalse(result.success, 'The save operation should have failed');
    Assert.isTrue(result.errors.insertErrors.size() > 0, 'There should be insert errors');

    for (OD_Datatable.SaveErrorWrapper error : result.errors.insertErrors) {
      Assert.isTrue(error.message != null && error.message.length() > 0, 'Error message should not be empty');
      Assert.isTrue(error.fieldErrors.size() > 0, 'Field errors should be captured');

      Boolean hasLastNameField = false;
      for (OD_Datatable.FieldErrorWrapper fieldError : error.fieldErrors) {
        if (fieldError.fieldName == 'LastName') {
          hasLastNameField = true;
          break;
        }
      }
      Assert.isTrue(hasLastNameField, 'LastName field should be in the field errors');
    }
  }

  @IsTest
  static void testSaveRecordsWithGeneralErrorsNoSharing() {
    Test.startTest();

    OD_Datatable.SaveResultWrapper result = OD_DatatableRecordsController.saveRecords(
      false,
      'Contact',
      'FirstName,LastName',
      '[{"FirstName": "Error1"}, {"FirstName": "Error2"}]',
      null,
      null,
      false
    );

    Test.stopTest();

    Assert.isFalse(result.success, 'The save operation should have failed');
    Assert.isTrue(result.errors.insertErrors.size() > 0, 'There should be insert errors');

    for (OD_Datatable.SaveErrorWrapper error : result.errors.insertErrors) {
      Assert.isTrue(error.message != null && error.message.length() > 0, 'Error message should not be empty');
      Assert.isTrue(error.fieldErrors.size() > 0, 'Field errors should be captured');
    }
  }

  @IsTest
  static void testGetRecordsRelatedListSuccessNoSharing() {
    Account acc = [SELECT Id FROM Account LIMIT 1];

    Test.startTest();

    List<SObject> records = OD_DatatableRecordsController.getRecordsRelatedList(
      false,
      'Contact',
      'AccountId',
      acc.Id,
      'FirstName,LastName'
    );

    Test.stopTest();

    Assert.isTrue(records.size() == 3, 'There are not 3 contacts');
  }

  @IsTest
  static void testGetRecordsRelatedListFailNoSharing() {
    Account acc = [SELECT Id FROM Account LIMIT 1];

    Test.startTest();

    try {
      List<SObject> records = OD_DatatableRecordsController.getRecordsRelatedList(
        false,
        'Contact',
        'AccountId__c',
        acc.Id,
        'FirstName,LastName'
      );
    } catch (Exception e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while trying to get the related list records:'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }

  @IsTest
  static void testGetRecordsSuccessNoSharing() {
    List<Contact> contacts = [SELECT Id FROM Contact ORDER BY LastName];

    Assert.isTrue(contacts.size() == 3, 'Wrong number of contacts before the process');

    Test.startTest();

    List<SObject> result = OD_DatatableRecordsController.getRecords(
      false,
      'Contact',
      'FirstName,LastName',
      'Id',
      new List<Id>{ contacts[0].Id, contacts[1].Id }
    );

    Test.stopTest();

    Assert.isTrue(result.size() == 2, 'Wrong number of returned records');
  }

  @IsTest
  static void testGetFieldsForObjectSuccessNoSharing() {
    Test.startTest();

    List<OD_Datatable.FieldWrapper> result = OD_DatatableRecordsController.getFieldsForObject(false, 'Account');

    Test.stopTest();

    Assert.isTrue(result.size() > 0, 'We couldn\'t find any field for the Account object');
  }

  @IsTest
  static void testGetFieldsForObjectFailNoSharing() {
    Test.startTest();

    try {
      List<OD_Datatable.FieldWrapper> result = OD_DatatableRecordsController.getFieldsForObject(false, null);
    } catch (AuraHandledException e) {
      Assert.isTrue(
        e.getMessage().contains('ERROR while getting the fields for the Object: null.'),
        'Wrong error message'
      );
    }

    Test.stopTest();
  }
}