import * as React from "react";
import { css } from "@emotion/core";
import { JobData } from "../types/job";

type PillsProps = {
    jobs: JobData[];
}

export const Pills: React.FunctionComponent<PillsProps> = ({jobs}) => {

    return (
        <React.Fragment>
            {jobs.map((job, index) => {
                return (
                    <div css={ css`
                        color: #722ed1;
                        background: #f9f0ff;
                        border: 1px solid #d3adf7;
                        border-radius: 30px;
                        padding: 2px 10px;
                        grid-area: job${index+1};
                        `}
                    >
                        {job.company}: {job.jobTitle}
                    </div>
                )
            })}
        </React.Fragment>
    );
};
