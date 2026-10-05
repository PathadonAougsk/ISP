"use client";

import { getTasks, type Task } from "@/lib/task";
import { useEffect, useState } from "react";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    getTasks()
      .then((body) => {
        setTasks(body.Tasks);
        console.log(body.Tasks);
      })
      .catch(() => {
        setTasks([]);
      });
  }, []);

  return <div></div>;
}
