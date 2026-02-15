---
title: "Req 6A — How AI Learns"
layout: guide
group_title: "Developing AI Skills"
req_number: "6a"
prev: "/merit-badges/artificial-intelligence/guide/req5/"
prev_title: "Req 5 — Deepfakes"
next: "/merit-badges/artificial-intelligence/guide/req6b/"
next_title: "Req 6B — Communicating with AI"
---

{{< drg/requirement number="6a" >}}
Discuss the learning process for AI and its limitations.
{{< /drg/requirement >}}

When we say an AI system "learns," we do not mean it learns the way you do. You can read a single story and understand its meaning. You can learn from one mistake and never make it again. AI is very different. Understanding how AI learns — and the real limits of that process — is essential to using AI wisely.

---

## How AI Learns: The Basics

At the highest level, AI learns by finding **patterns in data**. A human programmer does not write rules like "if the email contains the word 'prize,' mark it as spam." Instead, the programmer builds a system that can look at millions of examples and figure out the patterns on its own. This process is called **machine learning**.

Here is the general process:

### Step 1: Collect Training Data

Everything starts with data — lots of it. To teach an AI to recognize cats in photos, you might need hundreds of thousands of labeled images: "This is a cat. This is not a cat." To teach an AI to translate languages, you need millions of sentences that have already been translated by humans.

The quality and quantity of this training data determines almost everything about how well the AI will perform.

### Step 2: Choose a Model

A **model** is the mathematical structure that will learn from the data. Think of it like an empty brain that is ready to be trained. Different tasks require different types of models:

- **Neural networks** — Inspired by the human brain, these models are made up of layers of connected "neurons" that process information. They are the foundation of most modern AI.
- **Decision trees** — Models that make decisions by asking a series of yes/no questions, like a flowchart.
- **Large language models (LLMs)** — Massive neural networks trained on enormous amounts of text. ChatGPT and similar tools are LLMs.

### Step 3: Train the Model

During training, the model processes the data over and over, adjusting its internal settings each time to get better at the task. Imagine practicing free throws — each attempt, you adjust your form slightly based on whether the shot went in or not. AI training works similarly, except the "adjustments" are mathematical calculations happening millions of times per second.

### Step 4: Test and Evaluate

After training, the model is tested on new data it has never seen before. If it performs well on this new data, it is ready for use. If not, it goes back for more training or adjustments.

{{< drg/did-you-know >}}
Training a large AI model like GPT-4 required processing hundreds of billions of words of text and cost an estimated $100 million in computing power. A single training run can use as much electricity as a small town consumes in a year.
{{< /drg/did-you-know >}}

---

## Types of Learning

AI systems learn in different ways depending on the task and the available data:

### Supervised Learning

The AI is given labeled examples — data where the correct answer is already known. "Here is a picture of a cat. Here is a picture of a dog." The AI studies these examples and learns to classify new images on its own. This is the most common type of machine learning.

**Examples:** Email spam filters, medical image diagnosis, voice recognition

### Unsupervised Learning

The AI is given data without labels and must find patterns on its own. It groups similar things together without being told what the groups should be. This is useful when you have lots of data but do not know what patterns exist yet.

**Examples:** Customer segmentation in marketing, detecting unusual network activity, organizing large photo collections

### Reinforcement Learning

The AI learns through trial and error, receiving rewards for good outcomes and penalties for bad ones — like training a dog with treats. The AI tries different actions, sees what works, and gradually improves its strategy.

**Examples:** Game-playing AI (chess, Go), self-driving car navigation, robotic arm control

{{< drg/tip >}}
A helpful way to remember the three types: **Supervised** = learning with a teacher. **Unsupervised** = learning on your own. **Reinforcement** = learning from experience.
{{< /drg/tip >}}

---

## Try It Yourself

One of the best ways to understand how AI learns is to train one yourself. **Google Teachable Machine** is a free, browser-based tool that lets you teach an AI to recognize images, sounds, or poses — no coding required.

Here is a quick activity:

1. Go to [Teachable Machine](https://teachablemachine.withgoogle.com/)
2. Choose "Image Project"
3. Create two classes (for example, "thumbs up" and "thumbs down")
4. Use your webcam to record 30-50 examples of each gesture
5. Click "Train Model" and watch the AI learn
6. Test it in real time — hold up different gestures and see how it performs

Pay attention to what happens when you change the lighting, angle, or background. This will show you firsthand how sensitive AI training is to the quality and variety of its data.

{{< drg/image src="images/teachable-machine-training.png" alt="A Scout sitting at a computer using a webcam, holding up hand gestures to train an image recognition model. The screen shows a training interface with progress bars. Bright, casual setting." >}}

{{< drg/external-link title="Google Teachable Machine" url="https://teachablemachine.withgoogle.com/" description="Train your own AI model in your browser — no coding required. Recognize images, sounds, or body poses." >}}

---

## The Limitations of AI

AI can do remarkable things, but it has serious limitations that are important to understand. When discussing AI with your counselor, make sure you can explain these:

### AI Does Not Understand

This is the most fundamental limitation. AI systems process patterns in data — they do not understand meaning. A language model can generate a paragraph about grief, but it has never felt grief. An image recognition system can identify a stop sign, but it does not understand what "stopping" means. AI is very good at appearing intelligent without any actual understanding.

### Garbage In, Garbage Out

An AI system is only as good as its training data. If the data is biased, incomplete, or inaccurate, the AI will produce biased, incomplete, or inaccurate results. This is not a bug that can be fixed — it is built into how the technology works.

### AI Cannot Handle Novel Situations

AI excels at tasks similar to what it was trained on. But when it encounters something truly new — a situation unlike anything in its training data — it often fails badly. A self-driving car trained in sunny California may struggle in a snowstorm. A chatbot trained on English text cannot suddenly speak Swahili.

### AI Can Be Confidently Wrong

One of the most dangerous limitations is that AI systems can produce incorrect answers with complete confidence. A chatbot can state a false "fact" with the same tone and certainty as a true one. These are sometimes called **hallucinations** — the AI generates plausible-sounding information that is simply made up.

### AI Has No Common Sense

Humans have an enormous amount of common-sense knowledge that we take for granted. You know that ice is cold, that you cannot walk through walls, and that a baby cannot drive a car. AI systems do not have this kind of broad understanding. They can be tripped up by questions that any five-year-old could answer.

{{< drg/image src="images/neural-network-concept.png" alt="A Scout looking at a poster or screen showing a simplified neural network diagram — interconnected nodes in layers with data flowing through. The Scout is pointing at it, explaining to a buddy." >}}

### AI Requires Enormous Resources

Training large AI models requires massive amounts of data, computing power, energy, and money. Running these models after training also requires significant resources. This means the most powerful AI systems are controlled by a small number of very large companies — raising questions about access and equity.

{{< drg/safety-first >}}
Never trust AI output without verification — especially for important decisions. AI can sound authoritative while being completely wrong. Always cross-check AI-generated facts with reliable sources, and never use AI output as a substitute for your own critical thinking.
{{< /drg/safety-first >}}

---

## Preparing for Your Discussion

When you discuss the AI learning process and its limitations with your counselor, you should be ready to cover:

{{< drg/checklist title="Discussion Preparation" subtitle="Make sure you can explain each of these:" >}}

- The general process: data → model → training → testing
- At least two of the three learning types (supervised, unsupervised, reinforcement)
- Why training data quality matters so much
- At least three specific limitations of AI
- An example of how a limitation could cause real-world harm
- The difference between AI "learning" and human learning
  {{< /drg/checklist >}}

{{< drg/external-link title="Code.org — How AI Works" url="https://code.org/curriculum/how-ai-works" description="A free video series explaining machine learning, training data, and AI limitations in plain language." >}}

{{< drg/external-link title="Machine Learning for Kids" url="https://machinelearningforkids.co.uk/" description="Hands-on projects that teach machine learning concepts through building real AI models." >}}

{{< drg/next-page
    text="You now understand how AI learns and where it falls short."
    teaser="Next, discover the five main ways humans communicate with AI systems."
    url="/merit-badges/artificial-intelligence/guide/req6b/" >}}
