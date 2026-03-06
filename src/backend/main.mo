import Time "mo:core/Time";
import List "mo:core/List";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";

actor {
  // Type Definitions
  type IncidentStatus = {
    #Detected;
    #Analyzing;
    #Patching;
    #Sandboxing;
    #PRSubmitted;
    #Fixed;
    #Failed;
  };

  type Incident = {
    id : Nat;
    timestamp : Int;
    errorType : Text;
    filePath : Text;
    lineNumber : Nat;
    errorMessage : Text;
    rcaSummary : Text;
    patchCode : Text;
    testCode : Text;
    status : IncidentStatus;
    prUrl : Text;
    prTitle : Text;
    prDescription : Text;
  };

  type ActivityLog = {
    id : Nat;
    incidentId : Nat;
    timestamp : Int;
    action : Text;
    details : Text;
  };

  // Helper Modules
  module Incident {
    public func compare(a : Incident, b : Incident) : Order.Order {
      Int.compare(b.timestamp, a.timestamp); // Descending order
    };
  };

  module ActivityLog {
    public func compareByTimestamp(a : ActivityLog, b : ActivityLog) : Order.Order {
      Int.compare(b.timestamp, a.timestamp); // Descending order
    };
  };

  // Stable Storage
  var nextIncidentId = 0;
  var nextActivityId = 0;

  let incidents = Map.empty<Nat, Incident>();
  let activities = Map.empty<Nat, ActivityLog>();

  // Incident Management
  public shared ({ caller }) func createIncident(errorType : Text, filePath : Text, lineNumber : Nat, errorMessage : Text) : async Nat {
    let id = nextIncidentId;
    nextIncidentId += 1;

    let incident : Incident = {
      id;
      timestamp = Time.now();
      errorType;
      filePath;
      lineNumber;
      errorMessage;
      rcaSummary = "";
      patchCode = "";
      testCode = "";
      status = #Detected;
      prUrl = "";
      prTitle = "";
      prDescription = "";
    };

    incidents.add(id, incident);
    addActivityLog(id, "Incident Created", "Initial incident detected and stored");
    id;
  };

  public query ({ caller }) func getIncidents() : async [Incident] {
    incidents.values().toArray().sort();
  };

  public query ({ caller }) func getIncident(id : Nat) : async ?Incident {
    incidents.get(id);
  };

  public shared ({ caller }) func updateIncidentStatus(
    id : Nat,
    status : IncidentStatus,
    rcaSummary : Text,
    patchCode : Text,
    testCode : Text,
    prUrl : Text,
    prTitle : Text,
    prDescription : Text,
  ) : async () {
    switch (incidents.get(id)) {
      case (null) { Runtime.trap("Incident not found") };
      case (?incident) {
        let updatedIncident : Incident = {
          incident with
          status;
          rcaSummary;
          patchCode;
          testCode;
          prUrl;
          prTitle;
          prDescription;
        };
        incidents.add(id, updatedIncident);
        addActivityLog(id, "Status Update", debug_show (status));
      };
    };
  };

  public shared ({ caller }) func deleteIncident(id : Nat) : async () {
    if (not incidents.containsKey(id)) {
      Runtime.trap("Incident not found");
    };
    incidents.remove(id);
    addActivityLog(id, "Incident Deleted", "Incident removed from system");
  };

  // Activity Log Management
  func addActivityLog(incidentId : Nat, action : Text, details : Text) {
    let id = nextActivityId;
    nextActivityId += 1;

    let log : ActivityLog = {
      id;
      incidentId;
      timestamp = Time.now();
      action;
      details;
    };

    activities.add(id, log);
  };

  public query ({ caller }) func getActivityLog() : async [ActivityLog] {
    let sortedLogs = activities.values().toArray().sort(ActivityLog.compareByTimestamp);
    let len = sortedLogs.size();

    if (len > 50) {
      sortedLogs.sliceToArray(0, 50);
    } else {
      sortedLogs;
    };
  };

  public query ({ caller }) func getIncidentActivity(incidentId : Nat) : async [ActivityLog] {
    activities.values().toArray().filter(func(log) { log.incidentId == incidentId });
  };
};
