import React from "react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import type { Document } from "@contentful/rich-text-types";
import { BLOCKS, MARKS, INLINES } from "@contentful/rich-text-types";
import Image from "next/image";
import { Quiz } from "./quiz";

type Props = {
  document: Document;
};

export function RichText({ document }: Props) {
  function richTextToPlainText(doc: any): string {
    if (!doc) return "";
    try {
      const walk = (node: any): string => {
        if (!node) return "";
        if (typeof node === "string") return node;
        const nodeType = node.nodeType;
        if (nodeType === 'text') return node.value || '';
        const children = Array.isArray(node.content) ? node.content.map(walk).join("") : "";
        return children;
      };
      return walk(doc).replace(/\s+/g, ' ').trim();
    } catch {
      return "";
    }
  }
  const options = {
    renderText: (text: string) => {
      // Preserve line breaks inside paragraphs/code blocks
      return text.split("\n").reduce<(string | React.ReactElement)[]>((acc, segment, index) => {
        if (index > 0) acc.push(<br key={index} />);
        acc.push(segment);
        return acc;
      }, []);
    },
    renderMark: {
      [MARKS.CODE]: (text: React.ReactNode) => (
        <code className="bg-gray-100 rounded px-1 py-0.5 whitespace-pre-wrap font-mono text-[0.95em]">
          {text}
        </code>
      ),
    },
    renderNode: {
      [BLOCKS.PARAGRAPH]: (_node: any, children: any) => (
        <p className="mb-4 text-gray-800 leading-7">{children}</p>
      ),
      [BLOCKS.HEADING_1]: (_n: any, children: any) => (
        <h1 className="text-3xl font-bold mb-3 text-gray-900">{children}</h1>
      ),
      [BLOCKS.HEADING_2]: (_n: any, children: any) => (
        <h2 className="text-2xl font-semibold mb-2 mt-6 text-gray-900">{children}</h2>
      ),
      [BLOCKS.HEADING_3]: (_n: any, children: any) => (
        <h3 className="text-xl font-semibold mb-2 mt-4 text-gray-900">{children}</h3>
      ),
      [BLOCKS.UL_LIST]: (_n: any, children: any) => (
        <ul className="list-disc pl-6 mb-4 text-gray-800">{children}</ul>
      ),
      [BLOCKS.OL_LIST]: (_n: any, children: any) => (
        <ol className="list-decimal pl-6 mb-4 text-gray-800">{children}</ol>
      ),
      [BLOCKS.LIST_ITEM]: (_n: any, children: any) => <li className="mb-1">{children}</li>,
      [BLOCKS.QUOTE]: (_n: any, children: any) => (
        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4">{children}</blockquote>
      ),
      [BLOCKS.HR]: () => <hr className="my-6 border-gray-200" />,
      [BLOCKS.EMBEDDED_ASSET]: (node: any) => {
        const { title, file } = node.data.target.fields;
        const imageUrl = `https:${file.url}`;
        const imageAlt = title || "Contentful image";
        
        return (
          <div className="my-6">
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={file.details.image?.width || 800}
              height={file.details.image?.height || 600}
              className="rounded-lg shadow-sm max-w-full h-auto border border-gray-200"
            />
            {title && (
              <p className="text-sm text-gray-600 mt-2 text-center italic">{title}</p>
            )}
          </div>
        );
      },
      [INLINES.EMBEDDED_ENTRY]: (node: any) => {
        // Handle embedded entries if needed
        return <span className="text-gray-500">[Embedded Content]</span>;
      },
      [BLOCKS.EMBEDDED_ENTRY]: (node: any) => {
        const contentType = node.data?.target?.sys?.contentType?.sys?.id;
        console.log("Rendering embedded entry with content type:", contentType);
        
        // Handle quiz entries (flexible matching)
        if (contentType === 'quiz' || contentType === 'Quiz' || contentType?.toLowerCase().includes('quiz')) {
          const quizData = node.data.target.fields;
          console.log("Quiz data structure:", quizData);
          
          // Try different possible field structures
          let questions = [];
          
          if (quizData.questions) {
            // If questions is an array of entries
            questions = quizData.questions.map((q: any, index: number) => ({
              id: `q${index}`,
              question: q.fields?.question || q.question || '',
              options: q.fields?.options || q.options || [],
              correctAnswer: q.fields?.correctAnswer || q.correctAnswer || 0,
              explanation: q.fields?.explanation || q.explanation || ''
            }));
          } else if (quizData.question) {
            // If it's a single question
            questions = [{
              id: 'q0',
              question: quizData.question,
              options: quizData.options || [],
              correctAnswer: quizData.correctAnswer || 0,
              explanation: quizData.explanation || ''
            }];
          }
          
          console.log("Processed questions:", questions);
          
          if (questions.length > 0) {
            return (
              <Quiz 
                questions={questions} 
                title={quizData.title || 'Quiz'} 
              />
            );
          }
        }
        
        // Handle module entries that might contain quiz data
        if (contentType === 'module') {
          const moduleData = node.data.target.fields;
          
          // Look for quiz data within the module
          if (moduleData.quiz && Array.isArray(moduleData.quiz)) {
            // Filter out questions that are just links (not fully resolved)
            const resolvedQuestions = moduleData.quiz.filter((q: any) => q.fields && (q.fields.quesionText || q.fields.questionText));
            
            if (resolvedQuestions.length > 0) {
              const questions = resolvedQuestions.map((q: any, index: number) => {
                // Extract options and correct answer from linked Quiz Answer entries
                const answers: any[] = Array.isArray(q.fields.answers) ? q.fields.answers : [];
                const options = answers.map((ans: any) => richTextToPlainText(ans.fields?.answer));
                const correctIndex = Math.max(0, answers.findIndex((ans: any) => ans.fields?.isCorrect === true));
                const correctExp = answers[correctIndex]?.fields?.explanation;
                const explanation = richTextToPlainText(correctExp);
                
                return {
                  id: `q${index}`,
                  question: q.fields.quesionText || q.fields.questionText || '',
                  options,
                  correctAnswer: correctIndex,
                  explanation: explanation || ''
                };
              });
              
              return (
                <Quiz 
                  questions={questions} 
                  title={moduleData.title || 'Quiz'} 
                />
              );
            }
          }
        }
        
        // Handle other embedded entries
        return <div className="text-gray-500 p-4 border border-gray-200 rounded">[Embedded Content: {contentType || 'unknown'}]</div>;
      },
    },
  };

  return (
    <div className="max-w-none">
      {documentToReactComponents(document, options)}
    </div>
  );
}


