import * as React from "react";

const Question: React.FunctionComponent = () => {
    const questionArray = [{question: "Question01", rating: 0}, {question: "Question02", rating: 4}, {question: "Question03", rating: -1}, {question: "Question04", rating: 8}, {question: "Question05", rating: 2}, {question: "Question06", rating: 6}, {question: "Question07", rating: -4}, {question: "Question08", rating: 28}, {question: "Question09", rating: 0}]
    const [question, setQuestion] = React.useState("");
    const qIndex = 0;

    React.useEffect(() => {
        setQuestion(questionArray[qIndex].question)
    }, []);

    return (
        <div>
            {`This is the question ${question}`}
            <ul>
                {questionArray.map(obj => (
                    <li>{obj.question}</li>
                    )
                )}
            </ul>
        </div>
    );
};

export default Question;
