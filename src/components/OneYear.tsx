import * as React from "react";
import { Card } from "@material-ui/core";
import '../App.css';
import { JobsData } from "../types/job";
// import { jsx, css } from "@emotion";

const someStyle = css`
  background-color: blue;
`

type OneYearProps = {
    year: string;
    jobs: JobsData[];
}

export const OneYear: React.FunctionComponent<OneYearProps> = ({year, jobs}) => {

  return (
    <Card className="OneYear">
        <h3 css={someStyle}>{year}</h3>
        <p>Title: {jobs[0].job_title}</p>
        <p>Title: {jobs[1].job_title}</p>
    </Card>
  );
};
