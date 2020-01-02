export type JobData = {
    jobTitle: string;
    company: string;
    jobStartDate: string,
    jobEndDate: string,
    gridMapping: {
        emptyBefore: number,
        jobLength: number,
        emptyAfter: number,
    }
}
  