import * as React from "react";
import { OneYear } from "./OneYear";
import '../App.css';
import moment from "moment";
import TextField from '@material-ui/core/TextField';
import { Button } from "@material-ui/core";

const testData = [{
  jobTitle: "Farmer",
  company: "BigSky Corp",
  timeline: {
    startDate: "09/21/2018",
    endDate: "08/15/2019",
  },
},
{
  jobTitle: "Teacher",
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
  console.log(document.documentElement.style.getPropertyValue('--row-one'));
  console.log(document.documentElement.style.getPropertyValue('--row-two'));
  document.documentElement.style.setProperty('--row-one','"job2 job2 job2 job2 . . . . . . . ."');
  document.documentElement.style.setProperty('--row-two','". . . . . . . . . . job1 job1"');
  document.documentElement.style.setProperty('--row-three','". . . . . . . job3 job3 job3 job3 job3"');
  console.log(document.documentElement.style.getPropertyValue('--row-one'));
  console.log(document.documentElement.style.getPropertyValue('--row-two'));

}

const MainContainer: React.FunctionComponent = () => {
  monthFunction(testData[0].timeline.startDate, testData[0].timeline.endDate)

  const [formData, setFormData] = React.useState({
    jobTitle: "",
    company: "",
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
          id="jobTitle"
          name="jobTitle"
          label="Job Title"
          type="text"
          InputLabelProps={{
            shrink: true,
          }}
          onChange={e => updateFormData(e)}
        />
        <TextField
          id="company"
          name="company"
          label="company"
          type="text"
          InputLabelProps={{
            shrink: true,
          }}
          onChange={e => updateFormData(e)}
        />
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
        <OneYear year={"2012"} jobs={testData}/>
      </div>
    </div>
  );
};

export default MainContainer;
