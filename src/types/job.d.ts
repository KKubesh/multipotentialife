export type Months = {
    jan: boolean;
    feb: boolean;
    mar: boolean;
    apr: boolean;
    may: boolean;
    jun: boolean;
    jul: boolean;
    aug: boolean;
    sep: boolean;
    oct: boolean;
    nov: boolean;
    dec: boolean;
}

export type JobsData = {
    job_title: string;
    company: string;
    months_employed: Months;
}

  