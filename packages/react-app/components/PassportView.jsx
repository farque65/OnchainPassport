import { get, isEmpty } from "lodash";
import React from "react";
import { utils, constants } from "ethers";
import { text } from "node:stream/consumers";

function descriptionShorten(description) {
  if (!isEmpty(description)) {
    let front = description.slice(0, 100);
    if (description.length > 100) {
      front += "...";
    }
    return front;
  }
  return "n/a";
}

export default function PassportView({ data }) {
  console.log("VIEW DATA: ", data);
  return (
    <div className="h-full border-2 border-gray-200 border-opacity-60 rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-right flex-col ">
          <div>
            <strong>Issuance Date:</strong> {JSON.stringify(data.args.issuanceDate)}
          </div>
          <div>
            <strong>Passport ID:</strong> {JSON.stringify(data.args.passportId)}
          </div>
          <div>
            <strong>Passport Name:</strong> {JSON.stringify(data.args.passportName)}
          </div>
          <div>
            <strong>Timestamp:</strong>
            {JSON.stringify(data.args.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}
