package com.interviewprep.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;

@Slf4j
@Service
public class GeminiService {

    private final String apiKey;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiService(
            @Value("${app.gemini.api-key:}") String apiKey,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder().build();
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty() && !apiKey.equals("MOCK");
    }

    /**
     * Generates a list of questions using Gemini API or mock fallback.
     */
    public List<Map<String, String>> generateQuestions(String role, String difficulty, String type, String experienceLevel, int count, String clientApiKey) {
        String keyToUse = (clientApiKey != null && !clientApiKey.trim().isEmpty()) ? clientApiKey : this.apiKey;
        if (keyToUse == null || keyToUse.trim().isEmpty() || keyToUse.equals("MOCK")) {
            log.info("Gemini API Key is not configured. Falling back to mock question generation.");
            return generateMockQuestions(role, difficulty, type, count);
        }

        String prompt = String.format(
                "Generate exactly %d interview questions for a %s interview. " +
                "Target Role: %s. Difficulty: %s. Candidate Experience Level: %s. " +
                "Make the questions highly relevant, realistic, and challenging. " +
                "For technical interviews, include coding, architectural, or language-specific questions. " +
                "For behavioral, ask STAR-based situational questions. " +
                "Make sure each question has a 'text' and a 'topic'.",
                count, type, role, difficulty, experienceLevel
        );

        // Build Gemini Request Payload with structured JSON schema
        try {
            ObjectNode root = objectMapper.createObjectNode();
            
            // contents
            ArrayNode contents = root.putArray("contents");
            ObjectNode contentObj = contents.addObject();
            ArrayNode parts = contentObj.putArray("parts");
            parts.addObject().put("text", prompt);

            // generationConfig
            ObjectNode genConfig = root.putObject("generationConfig");
            genConfig.put("responseMimeType", "application/json");

            // responseSchema
            ObjectNode responseSchema = genConfig.putObject("responseSchema");
            responseSchema.put("type", "OBJECT");
            ObjectNode schemaProps = responseSchema.putObject("properties");
            
            ObjectNode questionsSchema = schemaProps.putObject("questions");
            questionsSchema.put("type", "ARRAY");
            ObjectNode itemSchema = questionsSchema.putObject("items");
            itemSchema.put("type", "OBJECT");
            ObjectNode itemProps = itemSchema.putObject("properties");
            itemProps.putObject("text").put("type", "STRING");
            itemProps.putObject("topic").put("type", "STRING");
            ArrayNode itemRequired = itemSchema.putArray("required");
            itemRequired.add("text").add("topic");

            ArrayNode rootRequired = responseSchema.putArray("required");
            rootRequired.add("questions");

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + keyToUse;

            String responseBody = restClient.post()
                    .uri(url)
                    .header("Content-Type", "application/json")
                    .body(root.toString())
                    .retrieve()
                    .body(String.class);

            return parseQuestionsResponse(responseBody);
        } catch (Exception e) {
            log.error("Failed to generate questions using Gemini API: {}. Falling back to mock.", e.getMessage(), e);
            return generateMockQuestions(role, difficulty, type, count);
        }
    }

    /**
     * Evaluates a user's answer using Gemini API or mock fallback.
     */
    public String evaluateAnswer(String question, String answer, String role, String difficulty, String type, String clientApiKey) {
        String keyToUse = (clientApiKey != null && !clientApiKey.trim().isEmpty()) ? clientApiKey : this.apiKey;
        if (keyToUse == null || keyToUse.trim().isEmpty() || keyToUse.equals("MOCK")) {
            log.info("Gemini API Key is not configured. Falling back to mock answer evaluation.");
            return generateMockEvaluation(question, answer);
        }

        String prompt = String.format(
                "Evaluate the candidate's answer for the following interview question.\n" +
                "Context: %s interview for role '%s' at difficulty '%s'.\n" +
                "Question: %s\n" +
                "Candidate's Answer: %s\n\n" +
                "Perform a thorough evaluation and score the answer out of 100 based on correctness, structure, clarity, and communication. " +
                "Generate strengths, weaknesses, suggested improvements, and a model answer comparison.",
                type, role, difficulty, question, answer
        );

        try {
            ObjectNode root = objectMapper.createObjectNode();
            
            // contents
            ArrayNode contents = root.putArray("contents");
            ObjectNode contentObj = contents.addObject();
            ArrayNode parts = contentObj.putArray("parts");
            parts.addObject().put("text", prompt);

            // generationConfig
            ObjectNode genConfig = root.putObject("generationConfig");
            genConfig.put("responseMimeType", "application/json");

            // responseSchema
            ObjectNode responseSchema = genConfig.putObject("responseSchema");
            responseSchema.put("type", "OBJECT");
            ObjectNode schemaProps = responseSchema.putObject("properties");
            
            schemaProps.putObject("score").put("type", "INTEGER");
            schemaProps.putObject("correctness").put("type", "STRING");
            schemaProps.putObject("clarity").put("type", "STRING");
            schemaProps.putObject("structure").put("type", "STRING");
            schemaProps.putObject("communication").put("type", "STRING");
            
            ObjectNode strengthsSchema = schemaProps.putObject("strengths");
            strengthsSchema.put("type", "ARRAY");
            strengthsSchema.putObject("items").put("type", "STRING");

            ObjectNode weaknessesSchema = schemaProps.putObject("weaknesses");
            weaknessesSchema.put("type", "ARRAY");
            weaknessesSchema.putObject("items").put("type", "STRING");

            schemaProps.putObject("suggestedImprovements").put("type", "STRING");
            schemaProps.putObject("modelAnswer").put("type", "STRING");

            ArrayNode rootRequired = responseSchema.putArray("required");
            rootRequired.add("score").add("correctness").add("clarity").add("structure")
                        .add("communication").add("strengths").add("weaknesses")
                        .add("suggestedImprovements").add("modelAnswer");

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + keyToUse;

            String responseBody = restClient.post()
                    .uri(url)
                    .header("Content-Type", "application/json")
                    .body(root.toString())
                    .retrieve()
                    .body(String.class);

            // Extracts the inner text candidate response from Gemini JSON structure
            return extractTextFromJsonResponse(responseBody);
        } catch (Exception e) {
            log.error("Failed to evaluate answer using Gemini API: {}. Falling back to mock.", e.getMessage(), e);
            return generateMockEvaluation(question, answer);
        }
    }

    private List<Map<String, String>> parseQuestionsResponse(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        String text = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        
        JsonNode innerRoot = objectMapper.readTree(text);
        JsonNode questionsNode = innerRoot.path("questions");
        List<Map<String, String>> questions = new ArrayList<>();
        
        if (questionsNode.isArray()) {
            for (JsonNode qNode : questionsNode) {
                Map<String, String> q = new HashMap<>();
                q.put("text", qNode.path("text").asText());
                q.put("topic", qNode.path("topic").asText());
                questions.add(q);
            }
        }
        return questions;
    }

    private String extractTextFromJsonResponse(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
    }

    // --- Mock Fallback Data Generators ---

    private List<Map<String, String>> generateMockQuestions(String role, String difficulty, String type, int count) {
        List<Map<String, String>> pool = new ArrayList<>();
        
        if ("TECHNICAL".equalsIgnoreCase(type)) {
            pool.add(createMockQuestionMap("Explain the internal working of HashMap in Java. How does hash collision resolution work?", "Java Collections"));
            pool.add(createMockQuestionMap("How would you design a rate limiter for a REST API with millions of users? What algorithms would you consider?", "System Design"));
            pool.add(createMockQuestionMap("Explain the difference between optimistic and pessimistic locking in JPA/Hibernate. When would you use each?", "Database / JPA"));
            pool.add(createMockQuestionMap("What is garbage collection in Java? Explain the difference between G1 and ZGC garbage collectors.", "Java Virtual Machine"));
            pool.add(createMockQuestionMap("What are Spring Bean scopes? Explain the difference between Singleton and Prototype scopes.", "Spring Framework"));
            pool.add(createMockQuestionMap("How does CompletableFuture work in Java? How does it differ from a standard Future?", "Java Concurrency"));
            pool.add(createMockQuestionMap("What is the difference between synchronized blocks and ReentrantLock in Java? When would you prefer ReentrantLock?", "Java Concurrency"));
            pool.add(createMockQuestionMap("How would you implement a distributed cache system? How do you ensure cache consistency with a database?", "System Architecture"));
            pool.add(createMockQuestionMap("What is Java's memory model (JMM)? Explain volatile, synchronized, and final variables.", "Java Virtual Machine"));
            pool.add(createMockQuestionMap("Explain database indexing. What is the difference between clustered and non-clustered index under the hood?", "Databases"));
            pool.add(createMockQuestionMap("What is the N+1 query problem in Hibernate, and what are the best strategies to resolve it?", "Database / JPA"));
        } else if ("BEHAVIORAL".equalsIgnoreCase(type)) {
            pool.add(createMockQuestionMap("Describe a situation where you had a conflict with a teammate or stakeholder. How did you resolve it?", "Conflict Resolution"));
            pool.add(createMockQuestionMap("Tell me about a time when you made a mistake on a project. How did you handle it and what did you learn?", "Accountability"));
            pool.add(createMockQuestionMap("Describe a complex technical challenge you solved recently. How did you approach the problem and what was the outcome?", "Problem Solving"));
            pool.add(createMockQuestionMap("Tell me about a time when you had to work under a tight deadline with incomplete requirements. How did you manage?", "Adaptability"));
            pool.add(createMockQuestionMap("Describe a situation where you had to persuade others to adopt your technical design or architecture choice.", "Influence"));
            pool.add(createMockQuestionMap("Tell me about a time when you mentored a junior engineer or helped a colleague solve a difficult problem.", "Leadership"));
            pool.add(createMockQuestionMap("Tell me about a time you took the initiative on a project to improve performance or developer productivity.", "Initiative"));
            pool.add(createMockQuestionMap("Describe a scenario where a project scope suddenly changed mid-way. How did you handle the transition?", "Adaptability"));
        } else if ("SYSTEM_DESIGN".equalsIgnoreCase(type)) {
            pool.add(createMockQuestionMap("How would you design a URL shortening service like Bit.ly? What database and caching strategy would you use?", "System Design"));
            pool.add(createMockQuestionMap("Design a real-time notification service (like push notifications, emails, SMS) at scale.", "System Design"));
            pool.add(createMockQuestionMap("How would you design a video streaming platform like YouTube or Netflix? Explain content ingestion and delivery (CDN).", "System Design"));
            pool.add(createMockQuestionMap("Design a chat application like WhatsApp or Slack. How do you handle message delivery guarantees and presence status?", "System Design"));
            pool.add(createMockQuestionMap("How would you design a global ride-hailing system like Uber? How do you handle spatial indexing and high-write tracking?", "System Design"));
            pool.add(createMockQuestionMap("Design an e-commerce checkout system. How do you handle inventory lock reservation and prevent double checkout under high load?", "System Design"));
        } else {
            pool.add(createMockQuestionMap("Why do you want to join our company, and where do you see yourself in the next three years?", "Career Goals"));
            pool.add(createMockQuestionMap("How do you prioritize your tasks when working on multiple projects with tight deadlines?", "Time Management"));
            pool.add(createMockQuestionMap("Describe a situation where you had to adapt to a sudden change in project requirements.", "Adaptability"));
            pool.add(createMockQuestionMap("What are your greatest strengths, and what is one area of improvement you are actively working on?", "Self Awareness"));
            pool.add(createMockQuestionMap("Tell me about a time you had to work with a difficult manager or client. How did you maintain a professional relationship?", "Professionalism"));
            pool.add(createMockQuestionMap("How do you keep yourself updated with the latest technological developments in software engineering?", "Continuous Learning"));
        }

        // Shuffle to randomize
        Collections.shuffle(pool);

        List<Map<String, String>> result = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            result.add(pool.get(i % pool.size()));
        }
        return result;
    }

    private Map<String, String> createMockQuestionMap(String text, String topic) {
        Map<String, String> map = new HashMap<>();
        map.put("text", text);
        map.put("topic", topic);
        return map;
    }

    private String generateMockEvaluation(String question, String answer) {
        String safeAnswer = answer != null ? answer : "";
        
        // Dynamic score calculation based on length and keyword matching
        int baseScore = 40;
        if (safeAnswer.length() > 10) baseScore += 15;
        if (safeAnswer.length() > 50) baseScore += 15;
        if (safeAnswer.length() > 120) baseScore += 10;
        
        // Look for keywords
        String lower = safeAnswer.toLowerCase();
        int keywordPoints = 0;
        String[] keywords = {"hash", "index", "lock", "cache", "thread", "scale", "design", "spring", "bean", "star", "conflict", "result", "situation", "task", "action"};
        for (String kw : keywords) {
            if (lower.contains(kw)) {
                keywordPoints += 4;
            }
        }
        int score = Math.min(100, baseScore + keywordPoints);
        
        ObjectNode responseJson = objectMapper.createObjectNode();
        responseJson.put("score", score);
        responseJson.put("correctness", score >= 75 ? 
            "The candidate shows a good conceptual understanding of the core topic, explaining key details." :
            "The response is too brief or lacks specific engineering context to demonstrate correctness.");
        responseJson.put("clarity", score >= 75 ? 
            "The explanations are easy to follow and the terminology is used correctly." : 
            "The response needs more elaboration to be clear and fully answer the question.");
        responseJson.put("structure", "The response uses direct explanations. Behavioral answers would benefit from a structured STAR layout.");
        responseJson.put("communication", "Professional tone, concise but would benefit from further explanation of complex parts.");
        
        ArrayNode strengths = responseJson.putArray("strengths");
        if (score >= 75) {
            strengths.add("Address the core concept directly").add("Clean explanation style");
        } else {
            strengths.add("Direct answer to the point");
        }

        ArrayNode weaknesses = responseJson.putArray("weaknesses");
        if (score >= 75) {
            weaknesses.add("Could provide a specific real-world example of implementation");
        } else {
            weaknesses.add("Extremely brief").add("Fails to cover edge cases or structural resolution details");
        }

        responseJson.put("suggestedImprovements", score >= 75 ?
            "To reach a perfect score, elaborate on concrete engineering trade-offs (e.g. time vs space complexity) and give an example." :
            "Provide a comprehensive answer. Outline the definition, write step-by-step processes, and include examples of how you'd handle edge cases.");
        responseJson.put("modelAnswer", "A strong response would define the core concept, explain how it operates under the hood (e.g., hash functions, buckets, linked lists/red-black trees for Java's HashMap), discuss collision resolution details, and reference time complexity (O(1) average, O(n) worst-case).");

        return responseJson.toString();
    }
}
