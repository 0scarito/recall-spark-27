import AppLayout from "@/components/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Brain, Check, X, RotateCcw, ChevronRight, BookOpen, Trash2 } from "lucide-react";
import { useQuestions, QuestionWithReview } from "@/hooks/useQuestions";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

const Review = () => {
  const { questions, isLoading, submitReview, getDueQuestions, deleteQuestion } = useQuestions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [isReviewing, setIsReviewing] = useState(false);

  const dueQuestions = useMemo(() => getDueQuestions(), [getDueQuestions]);

  const currentQuestion = dueQuestions[currentIndex];

  const startReview = () => {
    setIsReviewing(true);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionStats({ correct: 0, incorrect: 0 });
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!currentQuestion) return;
    
    await submitReview(currentQuestion.id, isCorrect);
    setSessionStats(prev => ({
      ...prev,
      [isCorrect ? 'correct' : 'incorrect']: prev[isCorrect ? 'correct' : 'incorrect'] + 1
    }));

    // Move to next question
    if (currentIndex < dueQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // End of session
      setIsReviewing(false);
    }
  };

  const progress = dueQuestions.length > 0 
    ? ((currentIndex + (showAnswer ? 0 : 0)) / dueQuestions.length) * 100 
    : 0;

  return (
    <AppLayout>
      <div className="max-w-5xl p-8">
        {/* Top tabs bar */}
        <div className="border-b border-border mb-6">
          <Tabs defaultValue="review" className="w-full">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger
                value="review"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Recall Review
              </TabsTrigger>
              <TabsTrigger
                value="cards"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
              >
                Cards and Questions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="review" className="mt-6">
              {!isReviewing ? (
                <div className="space-y-8">
                  <h1 className="text-4xl font-bold">Welcome to The Recall Review</h1>

                  {/* Stats Overview */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Due for Review</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{dueQuestions.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{questions.length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Last Session</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">
                          {sessionStats.correct + sessionStats.incorrect > 0 
                            ? `${Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)}%`
                            : '—'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Start Review Button */}
                  {dueQuestions.length > 0 ? (
                    <Button size="lg" className="w-full md:w-auto" onClick={startReview}>
                      <Brain className="w-5 h-5 mr-2" />
                      Start Review ({dueQuestions.length} cards)
                    </Button>
                  ) : (
                    <Card className="bg-muted/50">
                      <CardContent className="py-8 text-center">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-semibold mb-2">All caught up!</h3>
                        <p className="text-muted-foreground text-sm">
                          No questions due for review. Generate questions from your saved cards to start learning.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Info cards */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <HelpCircle className="w-5 h-5" />
                          What is it?
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          The Recall Review uses spaced repetition to help you remember what you've learned. 
                          Questions are shown at optimal intervals based on how well you remember them.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Getting Started</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          1. Save content to your knowledge base<br />
                          2. Open a card and click "Generate Questions"<br />
                          3. Come back here to review and remember
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                // Review Mode
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{currentIndex + 1} / {dueQuestions.length}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Question Card */}
                  {currentQuestion ? (
                    <Card className="min-h-[300px] flex flex-col">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge variant={
                            currentQuestion.difficulty === 'easy' ? 'secondary' :
                            currentQuestion.difficulty === 'hard' ? 'destructive' : 'default'
                          }>
                            {currentQuestion.difficulty}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {currentQuestion.cardTitle}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-center">
                        <p className="text-xl font-medium text-center mb-8">
                          {currentQuestion.question}
                        </p>

                        {showAnswer ? (
                          <div className="space-y-6">
                            <div className="bg-muted rounded-lg p-4">
                              <p className="text-center">{currentQuestion.answer}</p>
                            </div>
                            <div className="flex justify-center gap-4">
                              <Button 
                                variant="outline" 
                                size="lg"
                                className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleAnswer(false)}
                              >
                                <X className="w-5 h-5" />
                                Didn't Know
                              </Button>
                              <Button 
                                size="lg"
                                className="gap-2"
                                onClick={() => handleAnswer(true)}
                              >
                                <Check className="w-5 h-5" />
                                Got It!
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="lg" 
                            className="mx-auto"
                            onClick={() => setShowAnswer(true)}
                          >
                            Show Answer
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    // Session Complete
                    <Card>
                      <CardContent className="py-12 text-center">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
                        <p className="text-muted-foreground mb-6">
                          You reviewed {sessionStats.correct + sessionStats.incorrect} questions
                        </p>
                        <div className="flex justify-center gap-8 mb-6">
                          <div>
                            <p className="text-3xl font-bold text-green-500">{sessionStats.correct}</p>
                            <p className="text-sm text-muted-foreground">Correct</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-red-500">{sessionStats.incorrect}</p>
                            <p className="text-sm text-muted-foreground">Needs Review</p>
                          </div>
                        </div>
                        <Button onClick={() => setIsReviewing(false)}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Back to Overview
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Exit button */}
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setIsReviewing(false)}
                  >
                    Exit Review
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="cards" className="mt-6">
              <h2 className="text-2xl font-bold mb-6">Your Questions</h2>
              
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : questions.length === 0 ? (
                <Card className="bg-muted/50">
                  <CardContent className="py-8 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">No questions yet</h3>
                    <p className="text-muted-foreground text-sm">
                      Open a knowledge card and click "Generate Questions" to create review questions.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {questions.map((q) => (
                      <Card key={q.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={
                                  q.difficulty === 'easy' ? 'secondary' :
                                  q.difficulty === 'hard' ? 'destructive' : 'default'
                                } className="text-xs">
                                  {q.difficulty}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{q.cardTitle}</span>
                              </div>
                              <p className="font-medium mb-1">{q.question}</p>
                              <p className="text-sm text-muted-foreground">{q.answer}</p>
                              {q.lastReview && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Next review: {new Date(q.lastReview.next_review).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => deleteQuestion(q.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default Review;
