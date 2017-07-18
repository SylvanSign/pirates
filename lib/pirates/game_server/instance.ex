defmodule Pirates.GameServer.Instance do
  use GenServer
  @moduledoc """
  Functions to handle Pirates game servers.
  """

  @name __MODULE__
  @ticks_per_second 60
  @tick_timer_in_ms div(1 * 1_000, @ticks_per_second)

  defmodule State do
    @enforce_keys [:id, :pos, :rot]
    defstruct [:id, :pos, :rot]
  end

  ##############
  # Client API #
  ##############

  @doc """
  Starts up a new game server
  """
  def start_link do
    GenServer.start_link(@name, :ok, [])
  end

  @doc """
  Starts up a new game server and registers it under `@name`
  """
  def start_link(:named) do
    GenServer.start_link(@name, :ok, name: @name)
  end

  @doc """
  Registers the calling process on the given game server
  """
  def register(pid \\ @name) do
    GenServer.call(pid, :register)
  end

  @doc """
  Returns the table id of the given game server
  """
  def table(pid \\ @name) do
    GenServer.call(pid, :table)
  end

  @doc """
  Updates state of the calling process in the given table
  """
  def update_state(table, state = %State{}) do
    calling_pid = self()
    case :ets.lookup(table, calling_pid) do
      [{^calling_pid, _}] ->
        :ets.insert(table, {calling_pid, state})
        :ok
      [] ->
        {:error, "#{inspect(calling_pid)} is not registered on this server"}
    end
  end

  @doc """
  Produces a `{pids, states}` tuple from the given ets table
  """
  def state(table) do
    folding_fn = fn
      ({_key, value}, results) when value == %{} ->
        results
      ({pid, state = %State{}}, {pids, states}) ->
        {[pid | pids], [state | states]}
    end
    :ets.foldl(folding_fn, {[], []}, table)
  end

  @doc """
  Gets number of connections to instance
  """
  def count(table) do
    :ets.info(table, :size)
  end

  ####################
  # Server Callbacks #
  ####################

  def init(:ok) do
    opts = [
      :public,
      read_concurrency: true,
      write_concurrency: true
    ]
    table = :ets.new(:states, opts)

    # init timer
    :timer.send_interval(@tick_timer_in_ms, :tick)

    {:ok, table}
  end

  def handle_call(:register, {from_pid, _}, table) do
    if :ets.insert_new(table, {from_pid, %{}}) do
      Process.monitor(from_pid)
      IO.puts "Just registered #{inspect(from_pid)}"
      {:reply, {:ok, table}, table}
    else
      {:reply, {:error, "#{inspect(from_pid)} is already registered on this server"}, table}
    end
  end

  def handle_call(:table, _from, table) do
    {:reply, table, table}
  end

  def handle_info(:tick, table) do
    {pids, states} = Pirates.GameServer.Instance.state(table)
    pids |> Enum.each(fn pid -> send(pid, {:state_tick, states}) end)
    {:noreply, table}
  end

  # handle notifications of dead monitored processes
  def handle_info({:DOWN, _ref, :process, pid, _reason}, table) do
    :ets.delete(table, pid)
    IO.puts "Just deleted state for #{inspect(pid)}"
    if count(table) == 0 do
      Process.exit(self(), "Server was empty.")
    end
    {:noreply, table}
  end

  # handle any unexpected mail
  def handle_info(_msg, table) do
    {:noreply, table}
  end
end
