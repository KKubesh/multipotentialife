import * as React from "react";
import { Card } from "@material-ui/core";
import '../App.css';
import { JobsData } from "../types/job";

type OneYearProps = {
    year: string;
    jobs: JobsData[];
}

export const OneYear: React.FunctionComponent<OneYearProps> = ({year, jobs}) => {

  return (
    <Card className="OneYear">
        {/* <h3>{year}</h3>
        <p>Title: {jobs[0].job_title}</p>
        <p>Title: {jobs[1].job_title}</p> */}
        {/* <div className="blank1">blank1</div> */}
        <div className="job1">Content-1</div>
        {/* <div className="blank2">blank2</div> */}
        <div className="job2">Content-2</div>
        {/* <div className="blank3">blank3</div> */}
        <div className="job3">Content-3</div>
        {/* <div className="blank4">blank4</div> */}

    </Card>
  );
};
