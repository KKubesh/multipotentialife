import * as React from "react";
import '../App.css';
import { JobsData } from "../types/job";
import TimelinePill from "./TimelinePill";

type OneYearProps = {
    year: string;
    jobs: JobsData[];
}

export const OneYear: React.FunctionComponent<OneYearProps> = ({year, jobs}) => {

  return (
    <div className="OneYear">
      <h3>{year}</h3>
      {/* <p>Title: {jobs[0].job_title}</p>
      <p>Title: {jobs[1].job_title}</p> */}
      <TimelinePill />
    </div>
  );
};
