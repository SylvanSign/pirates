defmodule Pirates.GameServerTest do
  use ExUnit.Case, async: true
  alias Pirates.GameServer.Instance

  setup do
    {:ok, pid} = Instance.start_link()
    {:ok, table} = Instance.register(pid)
    {:ok, %{pid: pid, table: table}}
  end

  test "register errors when called again from same process", %{pid: pid} do
    assert {:error, _} = Instance.register(pid)
  end

  test "register always returns the same table for a given server", %{pid: pid, table: original_table} do
    task = Task.async fn ->
      {:ok, table} = Instance.register(pid)
      table
    end
    assert {:ok, ^original_table} = Task.yield(task)
  end

  test "update_state succeeds when called from a registered process", %{pid: pid, table: table} do
    assert :ok == Instance.update_state(table, "foo")

    task = Task.async fn ->
      {:ok, table} = Instance.register(pid)
      Instance.update_state(table, "foo")
    end
    assert {:ok, :ok} == Task.yield(task)
  end

  test "update_state errors when called from unregistered process", %{table: table} do
    task = Task.async fn ->
      Instance.update_state(table, "foo")
    end
    assert {:ok, {:error, _}} = Task.yield(task)
  end

  test "states returns a list of all states o a registered process", %{pid: pid, table: table} do
    assert [] == Instance.states(table)

    :ok = Instance.update_state(table, %{id: "foo"})
    assert [%{id: "foo"}] == Instance.states(table)

    task = Task.async fn ->
      {:ok, table} = Instance.register(pid)
      Instance.update_state(table, %{id: "bar"})
      Instance.states(table)
    end
    results = Task.yield(task)
    assert {:ok, [%{id: "foo"}, %{id: "bar"}]} == results
      or   {:ok, [%{id: "bar"}, %{id: "foo"}]} == results # no order to the ets table
  end

  test "states returns a list of all states regardless of registration", %{table: table} do
    assert [] == Instance.states(table)

    task = Task.async fn ->
      Instance.states(table)
    end
    results = Task.yield(task)
    assert {:ok, []} == results
  end

  test "states is automatically 'garbage collected' when a registered process dies", %{pid: pid, table: table} do
    assert [] == Instance.states(table)

    :ok = Instance.update_state(table, %{id: "foo"})
    assert [%{id: "foo"}] == Instance.states(table)

    task = Task.async fn ->
      {:ok, table} = Instance.register(pid)
      Instance.update_state(table, %{id: "bar"})
    end
    ref  = Process.monitor(task.pid)
    assert_receive {:DOWN, ^ref, :process, _, :normal}, 500

    # send a bogus synchronous request to ensure the game server has also processed the :DOWN event
    Instance.register(pid)
    assert [%{id: "foo"}] == Instance.states(table)
  end

  test "table returns the ets table id regardless of registration", %{pid: pid, table: table} do
    assert Instance.table(pid) == table
    task = Task.async fn ->
      Instance.table(pid)
    end
    assert {:ok, task_table} = Task.yield(task)
    assert task_table == table
  end
end
