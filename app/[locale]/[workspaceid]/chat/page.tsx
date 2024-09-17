"use client"

import { ChatHelp } from "@/components/chat/chat-help"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatUI } from "@/components/chat/chat-ui"
import { Brand } from "@/components/ui/brand"
import { ChatbotUIContext } from "@/context/context"
import { updateProfile } from "@/db/profile"
import useHotkey from "@/lib/hooks/use-hotkey"
import { useChat } from "ai/react"
import { useTheme } from "next-themes"
import { useContext, useEffect, useRef, useState } from "react"
import { Message } from "ai"

export default function ChatPage() {
  useHotkey("o", () => handleNewChat())

  const { profile, setProfile, chats, setAllChatRecallAnalysis } =
    useContext(ChatbotUIContext)

  const { handleNewChat, handleStartTutorial, handleResponse, handleFinish } =
    useChatHandler()

  const { theme } = useTheme()

  // Ref to track if the tutorial has been started to prevent duplicate executions
  const tutorialStartedRef = useRef(false)

  useEffect(() => {
    const startTutorial = async () => {
      if (profile && !profile.has_onboarded && !tutorialStartedRef.current) {
        console.log("Starting tutorial for the first time")
        tutorialStartedRef.current = true // Mark as tutorial started
        const updatedProfile = await updateProfile(profile.id, {
          ...profile,
          has_onboarded: true
        })
        setProfile(updatedProfile)
        handleStartTutorial(setMessages)
      }
    }

    startTutorial()
  }, [profile])

  useEffect(() => {
    const recallAnalysisInChats: { chatId: string; recallAnalysis: string }[] =
      chats.reduce(
        (acc: { chatId: string; recallAnalysis: string }[], chat) => {
          if (chat.recall_analysis != null) {
            try {
              const recallAnalysisList: string[] = JSON.parse(
                chat.recall_analysis as string
              )
              recallAnalysisList.forEach((recallAnalysis: string) => {
                acc.push({ chatId: chat.id, recallAnalysis })
              })
            } catch (e) {
              console.error(
                "Failed to parse recall_analysis:",
                chat.recall_analysis
              )
            }
          }
          return acc
        },
        []
      )

    if (recallAnalysisInChats.length > 0) {
      setAllChatRecallAnalysis(recallAnalysisInChats)
    }
  }, [chats])

  const [initialMessage, setInitialMessage] = useState<Message>()

  const {
    input,
    isLoading,
    handleInputChange,
    handleSubmit,
    stop,
    setInput,
    messages,
    append,
    setMessages
  } = useChat({
    keepLastMessageOnError: true,
    onResponse: handleResponse,
    onFinish: () => {
      handleFinish(messages, setMessages)
    },
    initialMessages: initialMessage ? [initialMessage] : []
  })

  return (
    <>
      {messages.length === 0 ? (
        <div className="relative flex h-full flex-col items-center justify-center">
          <div className="top-50% left-50% -translate-x-50% -translate-y-50% absolute mb-20">
            <Brand theme={theme === "dark" ? "dark" : "light"} />
          </div>

          <div className="flex grow flex-col items-center justify-center" />

          <div className="absolute bottom-2 right-2 hidden md:block lg:bottom-4 lg:right-4">
            <ChatHelp />
          </div>
        </div>
      ) : (
        <ChatUI
          input={input}
          isLoading={isLoading}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          stop={stop}
          setInput={setInput}
          messages={messages}
          append={append}
          setInitialMessage={setInitialMessage}
          setMessages={setMessages}
        />
      )}
    </>
  )
}
