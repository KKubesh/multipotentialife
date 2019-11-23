import * as React from "react";
import { OneYear } from "./OneYear";
import '../App.css';
import moment from "moment";

const testData = [{
  job_title: "Farmer",
  company: "BigSky Corp",
  timeline: {
    startDate: "09/21/2018",
    endDate: "08/15/2019",
  },
},
{
  job_title: "Teacher",
  company: "BigSky Corp",
  timeline: {
    startDate: "09/28/2019",
    endDate: "11/15/2020",
  },
}]

const monthFunction = (startDate: string, endDate: string) => {
  const output01 = [moment(startDate).format('M'), moment(startDate).format('YYYY')];
  const output02 = [moment(endDate).format('M'), moment(endDate).format('YYYY')];
  
  console.log(output01);
  console.log(output02);
}

const MainContainer: React.FunctionComponent = () => {
  monthFunction(testData[0].timeline.startDate, testData[0].timeline.endDate)
  return (
    <div className="MainContainer">
      <OneYear year={"2010"} jobs={testData}/>
      <OneYear year={"2011"} jobs={testData}/>
      <OneYear year={"2012"} jobs={testData}/>
    </div>
  );
};

export default MainContainer;
