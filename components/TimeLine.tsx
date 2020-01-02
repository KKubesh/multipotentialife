import * as React from "react";
import { JobData } from "../types/job";
import { Pills } from "./Pills";
import { css } from "@emotion/core";

const stringifyGridMap = (emptyBefore: number, jobLength: number, emptyAfter: number, index: number) => {
  let gridMapString = ""
  for (let i = 0; i < emptyBefore; i++) {
    gridMapString = gridMapString + ". ";
  }
  for (let i = 0; i < jobLength; i++) {
    gridMapString = gridMapString + `job${index+1} `;
  }
  if (emptyAfter) {
    for (let i = 0; i < emptyAfter; i++) {
      gridMapString = gridMapString + ". ";
    }
    gridMapString = gridMapString.substring(0, gridMapString.length - 1);
  }
  return gridMapString;
}

type TimeLineProps = {
    jobs: JobData[];
    timelineRows: string;
    timelineColumns: string;
}

export const Timeline: React.FunctionComponent<TimeLineProps> = ({jobs, timelineRows, timelineColumns}) => {
  let templateAreas = "";
  jobs.map((job, index) => {
    const { gridMapping } = job;
    templateAreas = `${templateAreas}\n"${stringifyGridMap(gridMapping.emptyBefore, gridMapping.jobLength, gridMapping.emptyAfter, index)}"`
  })
  return (
    <div css={
      css`
        margin: 30px;
        display: grid;
        grid-template-columns: ${timelineColumns};
        grid-template-rows: ${timelineRows};
        grid-row-gap: 1rem;
        grid-template-areas:
          ${templateAreas}
      `}
    >
      <Pills jobs={jobs}/>
    </div>
  );
};
