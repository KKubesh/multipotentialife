import * as React from "react";
import { Card } from "@material-ui/core";
import { OneYear } from "./OneYear";
import '../App.css';

const testData = [{
  job_title: "Farmer",
  company: "BigSky Corp",
  months_employed: {
    jan: false,
    feb: false,
    mar: false,
    apr: false,
    may: false,
    jun: true,
    jul: true,
    aug: true,
    sep: true,
    oct: true,
    nov: true,
    dec: true,
  },
},
{
  job_title: "Teacher",
  company: "BigSky Corp",
  months_employed: {
    jan: true,
    feb: true,
    mar: true,
    apr: false,
    may: false,
    jun: false,
    jul: false,
    aug: false,
    sep: false,
    oct: false,
    nov: false,
    dec: false,
  },
}]

const MainContainer: React.FunctionComponent = () => {

  return (
    <Card className="MainContainer">
      Main Container
      <div className="PillTest">
        Some kind of test
      </div>
      <OneYear year={"2010"} jobs={testData}/>
    </Card>
  );
};

export default MainContainer;
