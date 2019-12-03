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
      <TimelinePill />
    </div>
  );
};
