import * as React from "react";
import { OneYear } from "./OneYear";
import '../App.css';
import moment from "moment";
import TextField from '@material-ui/core/TextField';
import { Button } from "@material-ui/core";

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

const setDates = (formData: any) => {
  console.log(Math.floor(moment(formData.endDate).diff(moment(formData.startDate), 'months', true)));
  console.log(formData);
}

const MainContainer: React.FunctionComponent = () => {
  monthFunction(testData[0].timeline.startDate, testData[0].timeline.endDate)

  const [formData, setFormData] = React.useState({
    startDate: "",
    endDate: moment().format('YYYY-MM-DD')
  });
  
  const updateFormData = (event: any) => {
    console.log(event.target.value);
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  }


  
  return (
    <div>
      <form noValidate>
        <TextField
          id="startDate"
          name="startDate"
          label="Timeline Start Date"
          type="date"
          InputLabelProps={{
            shrink: true,
          }}
          onChange={e => updateFormData(e)}
        />
        <TextField
          id="endDate"
          name="endDate"
          label="Timeline End Date"
          type="date"
          defaultValue={moment().format('YYYY-MM-DD')}
          InputLabelProps={{
            shrink: true,
          }}
          onChange={e => updateFormData(e)}
        />
        <Button onClick={() => setDates(formData)}>
          Set Dates
        </Button>
      </form>
      <div className="MainContainer">
        <OneYear year={"2010"} jobs={testData}/>
        <OneYear year={"2011"} jobs={testData}/>
        <OneYear year={"2012"} jobs={testData}/>
      </div>
    </div>
  );
};

export default MainContainer;
