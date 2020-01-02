import * as React from "react";
import { Timeline } from "./TimeLine";
import moment from "moment";
import { TextField } from "@material-ui/core"
import { Button } from 'semantic-ui-react';
import { jsx, css, Global, ClassNames } from '@emotion/core'
import styled from "@emotion/styled";
import { JobData } from "../types/job";

const MainContainer = styled.div`
  width: 900px;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap; 
  overflow: auto;
`;

const FormContainer = styled.div`
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap; 
  overflow: auto;
`;

const textContainer = css`
  margin: 15px;
`;

const formInputs = css`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const center = css`
  display: flex;
  justify-content: center;
`;

const monthFunction = (startDate: string, endDate: string) => {
  return Math.floor(moment(endDate).diff(moment(startDate), 'months', true));
}

export const Main: React.FunctionComponent = () => {
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState(moment().format('YYYY-MM-DD'));
  const [jobsArray, setJobsArray] = React.useState<JobData[]>([]);
  const [timelineRows, setTimelineRows] = React.useState<string>("");
  const [timelineColumns, setTimelineColumns] = React.useState<string>("");
  

  const updateTimelineRows = () => {
    let gridRows = "24px";
    for(let i = 0; i < jobsArray.length-1; i++){
      gridRows += " 24px";
    }
    setTimelineRows(gridRows);
  }


  const setTimelineHandler = () => {
    const timelineLength = monthFunction(startDate, endDate);
    updateTimelineColumns(timelineLength)
  }


  const updateTimelineColumns = (timelineLength: number) => {
    let gridColumns = "1fr";
    for(let i = 0; i < timelineLength-1; i++){
      gridColumns += " 1fr";
    }
    setTimelineColumns(gridColumns);
  }

  const [formData, setFormData] = React.useState<JobData>({
    jobTitle: "",
    company: "",
    jobStartDate: "",
    jobEndDate: moment().format('YYYY-MM-DD'),
    gridMapping: {
      emptyBefore: 0,
      jobLength: 0,
      emptyAfter: 0,
    }
  });

  const addJobHandler = () => {
    setJobsArray(jobsArray => [...jobsArray, formData]);
    updateTimelineRows();
  }

  const updateStartDate = (event: any) => {
    setStartDate(event.target.value);
  }

  const updateEndDate = (event: any) => {
    setEndDate(event.target.value);
  }
  
  const updateFormData = (event: any) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });
  }

  React.useEffect(() => {
    setFormData({
      ...formData,
      gridMapping: {
        emptyBefore: monthFunction(startDate, formData.jobStartDate),
        jobLength: monthFunction(formData.jobStartDate, formData.jobEndDate),
        emptyAfter: monthFunction(formData.jobEndDate, endDate),
      }
    });
  }, [startDate, endDate, formData.jobStartDate, formData.jobEndDate])
  
  return (
    <MainContainer>
      <FormContainer>
        <form css={formInputs} noValidate>
          <div css={center}>
            <TextField
              css={textContainer}
              id="startDate"
              name="startDate"
              type="date"
              placeholder="Timeline Start Date"
              required
              onChange={e => updateStartDate(e)}
            />
            <TextField
              css={textContainer}
              id="endDate"
              name="endDate"
              placeholder="Timeline End Date"
              type="date"
              required
              defaultValue={moment().format('YYYY-MM-DD')}
              onChange={e => updateEndDate(e)}
            />
          </div>
          <Button css={css`width: 200px; justify-self: center;`} variant={"outlined"} onClick={() => setTimelineHandler()}>
            Set Dates
          </Button>
        </form>
        <form noValidate>
          <TextField
            css={textContainer}
            id="jobTitle"
            name="jobTitle"
            placeholder="Job Title"
            type="text"
            required
            onChange={e => updateFormData(e)}
          />
          <TextField
            css={textContainer}
            id="company"
            name="company"
            placeholder="company"
            type="text"
            required
            onChange={e => updateFormData(e)}
          />
          <TextField
            css={textContainer}
            id="jobStartDate"
            name="jobStartDate"
            placeholder="Job Start Date"
            type="date"
            required
            onChange={e => updateFormData(e)}
          />
          <TextField
            css={textContainer}
            id="jobEndDate"
            name="jobEndDate"
            placeholder={moment().format('YYYY-MM-DD')}
            onChange={e => updateFormData(e)}
          />
          <select name="cars">
            <option value="volvo">Volvo XC90</option>
            <option value="saab">Saab 95</option>
            <option value="mercedes">Mercedes SLK</option>
            <option value="audi">Audi TT</option>
          </select>
          <Button disabled={!timelineColumns} variant={"outlined"} onClick={() => addJobHandler()}>
            Add Job
          </Button>
        </form>
      </FormContainer>
      <Timeline jobs={jobsArray} timelineColumns={timelineColumns} timelineRows={timelineRows}/>
    </MainContainer>
  );
};
